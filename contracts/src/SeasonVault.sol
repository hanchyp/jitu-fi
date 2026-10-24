// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IYieldStrategy} from "./interfaces/IYieldStrategy.sol";
import {IPointsSource} from "./interfaces/IPointsSource.sol";
import {ISeasonVault} from "./interfaces/ISeasonVault.sol";

/// @title SeasonVault
/// @notice Holds principal for fixed-tenor seasons, parks it in a yield strategy, and at maturity
/// splits the yield into a fee, a pro-rata base yield and a bonus pot shared by season points.
/// Principal is always returned; pausing only stops new deposits, never claims.
contract SeasonVault is ISeasonVault, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant SEASON_MANAGER_ROLE = keccak256("SEASON_MANAGER_ROLE");

    uint256 public constant MIN_DEPOSIT = 10e6;
    uint256 public constant WEIGHT_CAP = 1_000e6;
    uint256 public constant FEE_BPS = 1_500;
    uint256 private constant BPS = 10_000;

    struct Season {
        uint64 enrollStart;
        uint64 start;
        uint64 end;
        Status status;
        bool shortfall;
        uint32 depositors;
        uint32 claims;
        uint256 totalPrincipal;
        uint256 sponsorFunds;
        // Set at finalize.
        uint256 returnedPrincipal;
        uint256 fee;
        uint256 baseYield;
        uint256 bonusPot;
        uint256 totalWeightedPoints;
        uint256 paidOut;
    }

    struct Position {
        uint256 principal;
        bool claimed;
    }

    IERC20 public immutable token;
    IYieldStrategy public immutable strategy;
    address public immutable feeRecipient;
    IPointsSource public game;

    uint256 public seasonCount;
    mapping(uint256 seasonId => Season) internal _seasons;
    mapping(uint256 seasonId => mapping(address user => Position)) public positions;
    mapping(address user => uint256 seasonId) public activeSeasonOf;

    event GameSet(address game);
    event SeasonCreated(uint256 indexed seasonId, uint64 enrollStart, uint64 start, uint64 end);
    event Deposited(uint256 indexed seasonId, address indexed user, uint256 amount, uint256 principal);
    event SeasonActivated(uint256 indexed seasonId, uint256 totalPrincipal);
    event BonusFunded(uint256 indexed seasonId, address indexed sponsor, uint256 amount);
    event SeasonFinalized(
        uint256 indexed seasonId,
        uint256 withdrawn,
        uint256 fee,
        uint256 baseYield,
        uint256 bonusPot,
        uint256 totalWeightedPoints
    );
    event Shortfall(uint256 indexed seasonId, uint256 returnedPrincipal, uint256 totalPrincipal);
    event Claimed(uint256 indexed seasonId, address indexed user, uint256 principal, uint256 base, uint256 bonus);
    event DustSwept(uint256 indexed seasonId, address to, uint256 amount);

    error GameAlreadySet();
    error InvalidSchedule();
    error UnknownSeason();
    error WrongStatus(Status status);
    error NotEnrolling();
    error BelowMinimum();
    error OtherSeasonOpen(uint256 seasonId);
    error TooEarly();
    error NothingToClaim();
    error AlreadyClaimed();
    error UnclaimedPositions();

    constructor(IERC20 token_, IYieldStrategy strategy_, address feeRecipient_, address admin) {
        token = token_;
        strategy = strategy_;
        feeRecipient = feeRecipient_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SEASON_MANAGER_ROLE, admin);
        token_.forceApprove(address(strategy_), type(uint256).max);
    }

    // ---------------------------------------------------------------- admin

    function setGame(IPointsSource game_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(game) != address(0)) revert GameAlreadySet();
        game = game_;
        emit GameSet(address(game_));
    }

    function createSeason(uint64 enrollStart, uint64 start, uint64 end)
        external
        onlyRole(SEASON_MANAGER_ROLE)
        returns (uint256 seasonId)
    {
        if (!(enrollStart < start && start < end)) revert InvalidSchedule();
        seasonId = ++seasonCount;
        Season storage s = _seasons[seasonId];
        s.enrollStart = enrollStart;
        s.start = start;
        s.end = end;
        s.status = Status.Enrollment;
        emit SeasonCreated(seasonId, enrollStart, start, end);
    }

    /// @notice Stops new deposits only. Claims stay open.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Sweeps rounding dust once every depositor of a finalized season has claimed.
    function sweepDust(uint256 seasonId, address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Season storage s = _season(seasonId);
        if (s.status != Status.Finalized) revert WrongStatus(s.status);
        if (s.claims != s.depositors) revert UnclaimedPositions();
        uint256 allocated = s.returnedPrincipal + s.baseYield + s.bonusPot;
        uint256 dust = allocated - s.paidOut;
        s.paidOut = allocated;
        if (dust > 0) token.safeTransfer(to, dust);
        emit DustSwept(seasonId, to, dust);
    }

    // ---------------------------------------------------------------- deposits

    function deposit(uint256 seasonId, uint256 amount) external nonReentrant whenNotPaused {
        _deposit(seasonId, msg.sender, amount);
    }

    /// @notice Deposit authorized by an EIP-2612 permit. Anyone may submit it; funds always come
    /// from and are credited to `owner`.
    function depositWithPermit(
        uint256 seasonId,
        address owner,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant whenNotPaused {
        // A front-run permit leaves the allowance in place, so a failed permit is not fatal.
        try IERC20Permit(address(token)).permit(owner, address(this), amount, deadline, v, r, s) {} catch {}
        _deposit(seasonId, owner, amount);
    }

    function _deposit(uint256 seasonId, address user, uint256 amount) internal {
        Season storage s = _season(seasonId);
        if (s.status != Status.Enrollment || block.timestamp < s.enrollStart || block.timestamp >= s.start) {
            revert NotEnrolling();
        }
        if (amount < MIN_DEPOSIT) revert BelowMinimum();

        uint256 open = activeSeasonOf[user];
        if (open != 0 && open != seasonId && _seasons[open].status != Status.Finalized) {
            revert OtherSeasonOpen(open);
        }
        activeSeasonOf[user] = seasonId;

        Position storage p = positions[seasonId][user];
        if (p.principal == 0) s.depositors += 1;
        p.principal += amount;
        s.totalPrincipal += amount;

        token.safeTransferFrom(user, address(this), amount);
        emit Deposited(seasonId, user, amount, p.principal);
    }

    // ---------------------------------------------------------------- lifecycle

    function activate(uint256 seasonId) external nonReentrant {
        _activate(_season(seasonId), seasonId);
    }

    function _activate(Season storage s, uint256 seasonId) internal {
        if (s.status != Status.Enrollment) revert WrongStatus(s.status);
        if (block.timestamp < s.start) revert TooEarly();
        s.status = Status.Active;
        if (s.totalPrincipal > 0) strategy.deposit(seasonId, s.totalPrincipal);
        emit SeasonActivated(seasonId, s.totalPrincipal);
    }

    /// @notice Sponsors top up a season's bonus pot. Never charged the fee and kept through a shortfall.
    function fundBonus(uint256 seasonId, uint256 amount) external nonReentrant {
        Season storage s = _season(seasonId);
        if (s.status == Status.Finalized) revert WrongStatus(s.status);
        s.sponsorFunds += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit BonusFunded(seasonId, msg.sender, amount);
    }

    function finalize(uint256 seasonId) external nonReentrant {
        Season storage s = _season(seasonId);
        if (block.timestamp < s.end) revert TooEarly();
        if (s.status == Status.Enrollment) _activate(s, seasonId);
        if (s.status != Status.Active) revert WrongStatus(s.status);

        uint256 withdrawn = s.totalPrincipal > 0 ? strategy.withdrawAll(seasonId) : 0;
        uint256 twp = address(game) == address(0) ? 0 : game.seasonTotalWeighted(seasonId);
        Split memory sp = _split(withdrawn, s.totalPrincipal, s.sponsorFunds, twp);

        s.status = Status.Finalized;
        s.shortfall = sp.shortfall;
        s.returnedPrincipal = sp.returnedPrincipal;
        s.fee = sp.fee;
        s.baseYield = sp.baseYield;
        s.bonusPot = sp.bonusPot;
        s.totalWeightedPoints = twp;

        if (sp.fee > 0) token.safeTransfer(feeRecipient, sp.fee);
        if (sp.shortfall) emit Shortfall(seasonId, sp.returnedPrincipal, s.totalPrincipal);
        emit SeasonFinalized(seasonId, withdrawn, sp.fee, sp.baseYield, sp.bonusPot, twp);
    }

    // ---------------------------------------------------------------- claims

    /// @notice Pays principal, base yield and bonus once the season is finalized. Never pausable.
    function claim(uint256 seasonId) external nonReentrant {
        Season storage s = _season(seasonId);
        if (s.status != Status.Finalized) revert WrongStatus(s.status);
        Position storage p = positions[seasonId][msg.sender];
        if (p.principal == 0) revert NothingToClaim();
        if (p.claimed) revert AlreadyClaimed();

        (uint256 principalPart, uint256 basePart, uint256 bonusPart) = _payout(
            s, seasonId, msg.sender, p.principal, s.returnedPrincipal, s.baseYield, s.bonusPot, s.totalWeightedPoints
        );
        p.claimed = true;
        s.claims += 1;
        uint256 total = principalPart + basePart + bonusPart;
        s.paidOut += total;

        token.safeTransfer(msg.sender, total);
        emit Claimed(seasonId, msg.sender, principalPart, basePart, bonusPart);
    }

    /// @notice Exact payout after finalize; before it, an estimate from current strategy assets and points.
    function previewClaim(uint256 seasonId, address user)
        external
        view
        returns (uint256 principalPart, uint256 basePart, uint256 bonusPart)
    {
        Season storage s = _season(seasonId);
        Position storage p = positions[seasonId][user];
        if (p.principal == 0 || p.claimed) return (0, 0, 0);

        if (s.status == Status.Finalized) {
            return _payout(
                s, seasonId, user, p.principal, s.returnedPrincipal, s.baseYield, s.bonusPot, s.totalWeightedPoints
            );
        }
        uint256 assets = s.status == Status.Active ? strategy.totalAssets(seasonId) : s.totalPrincipal;
        uint256 twp = address(game) == address(0) ? 0 : game.seasonTotalWeighted(seasonId);
        Split memory sp = _split(assets, s.totalPrincipal, s.sponsorFunds, twp);
        return _payout(s, seasonId, user, p.principal, sp.returnedPrincipal, sp.baseYield, sp.bonusPot, twp);
    }

    // ---------------------------------------------------------------- views

    function getSeason(uint256 seasonId) external view returns (Season memory) {
        return _seasons[seasonId];
    }

    function principalOf(uint256 seasonId, address user) external view returns (uint256) {
        return positions[seasonId][user].principal;
    }

    function weightOf(uint256 seasonId, address user) public view returns (uint256) {
        uint256 principal = positions[seasonId][user].principal;
        return principal < WEIGHT_CAP ? principal : WEIGHT_CAP;
    }

    function isEligible(uint256 seasonId, address user) external view returns (bool) {
        return _seasons[seasonId].status == Status.Active && positions[seasonId][user].principal > 0;
    }

    function seasonEnd(uint256 seasonId) external view returns (uint64) {
        return _seasons[seasonId].end;
    }

    function seasonStatus(uint256 seasonId) external view returns (Status) {
        return _seasons[seasonId].status;
    }

    // ---------------------------------------------------------------- internals

    struct Split {
        uint256 returnedPrincipal;
        uint256 fee;
        uint256 baseYield;
        uint256 bonusPot;
        bool shortfall;
    }

    function _split(uint256 withdrawn, uint256 totalPrincipal, uint256 sponsor, uint256 twp)
        internal
        pure
        returns (Split memory sp)
    {
        if (withdrawn < totalPrincipal) {
            sp.shortfall = true;
            sp.returnedPrincipal = withdrawn;
            sp.bonusPot = sponsor;
        } else {
            uint256 yield_ = withdrawn - totalPrincipal;
            sp.returnedPrincipal = totalPrincipal;
            sp.fee = (yield_ * FEE_BPS) / BPS;
            uint256 rest = yield_ - sp.fee;
            sp.baseYield = rest / 2;
            sp.bonusPot = rest - sp.baseYield + sponsor;
        }
        // Nobody earned points: the whole pot is shared pro-rata instead.
        if (twp == 0) {
            sp.baseYield += sp.bonusPot;
            sp.bonusPot = 0;
        }
    }

    function _payout(
        Season storage s,
        uint256 seasonId,
        address user,
        uint256 principal,
        uint256 returnedPrincipal,
        uint256 baseYield,
        uint256 bonusPot,
        uint256 twp
    ) internal view returns (uint256 principalPart, uint256 basePart, uint256 bonusPart) {
        uint256 totalPrincipal = s.totalPrincipal;
        principalPart = returnedPrincipal == totalPrincipal ? principal : (principal * returnedPrincipal) / totalPrincipal;
        basePart = (baseYield * principal) / totalPrincipal;
        if (bonusPot > 0 && twp > 0) {
            uint256 points = game.seasonPoints(seasonId, user);
            bonusPart = (bonusPot * points * weightOf(seasonId, user)) / twp;
        }
    }

    function _season(uint256 seasonId) internal view returns (Season storage s) {
        s = _seasons[seasonId];
        if (s.status == Status.None) revert UnknownSeason();
    }
}
