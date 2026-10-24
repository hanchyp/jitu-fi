// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";
import {MockYieldStrategy} from "../src/mocks/MockYieldStrategy.sol";
import {SeasonVault} from "../src/SeasonVault.sol";
import {GameManager} from "../src/GameManager.sol";
import {ISeasonVault} from "../src/interfaces/ISeasonVault.sol";

/// @dev Drives one season through random deposits, game records at random times around the season
/// end, finalize and claims. Ghost totals let the invariants compare payouts with the pots.
contract Handler is Test {
    MockUSD public token;
    SeasonVault public vault;
    GameManager public game;
    address public keeper;
    uint256 public seasonId;
    uint64 public end;

    address[] public actors;
    uint256 public ghostBonusPaid;
    uint256 public ghostTotalPaid;
    uint256 public ghostUnderpaid; // claims below principal outside a shortfall
    uint256 internal nonce;

    constructor(MockUSD token_, SeasonVault vault_, GameManager game_, address keeper_, uint256 seasonId_) {
        token = token_;
        vault = vault_;
        game = game_;
        keeper = keeper_;
        seasonId = seasonId_;
        end = vault_.seasonEnd(seasonId_);
        for (uint256 i; i < 4; i++) {
            actors.push(makeAddr(string(abi.encode("actor", i))));
        }
    }

    function deposit(uint256 actorSeed, uint256 amount) external {
        address a = actors[actorSeed % actors.length];
        amount = bound(amount, 10e6, 3_000e6);
        if (vault.seasonStatus(seasonId) != ISeasonVault.Status.Enrollment) return;
        if (block.timestamp >= vault.getSeason(seasonId).start) return;
        token.mint(a, amount);
        vm.startPrank(a);
        token.approve(address(vault), amount);
        vault.deposit(seasonId, amount);
        vm.stopPrank();
    }

    function activate() external {
        if (vault.seasonStatus(seasonId) != ISeasonVault.Status.Enrollment) return;
        if (block.timestamp < vault.getSeason(seasonId).start) return;
        vault.activate(seasonId);
    }

    function recordGame(uint256 actorSeed, int256 score) external {
        address a = actors[actorSeed % actors.length];
        score = bound(score, -500, 10_000);
        if (vault.principalOf(seasonId, a) == 0) return;
        ISeasonVault.Status st = vault.seasonStatus(seasonId);
        if (st == ISeasonVault.Status.Enrollment && block.timestamp < end) return; // reverts by design
        vm.prank(keeper);
        game.recordGame(keccak256(abi.encode(nonce++)), a, score, bytes32(0));
    }

    /// @dev Moves time in steps that land before, at and after the season end.
    function warp(uint256 secs) external {
        secs = bound(secs, 1, 6 hours);
        vm.warp(block.timestamp + secs);
    }

    function finalize() external {
        if (block.timestamp < end) return;
        if (vault.seasonStatus(seasonId) == ISeasonVault.Status.Finalized) return;
        vault.finalize(seasonId);
    }

    function claim(uint256 actorSeed) external {
        address a = actors[actorSeed % actors.length];
        if (vault.seasonStatus(seasonId) != ISeasonVault.Status.Finalized) return;
        (uint256 principal, bool claimed) = vault.positions(seasonId, a);
        if (principal == 0 || claimed) return;
        (uint256 p, uint256 b, uint256 bonus) = vault.previewClaim(seasonId, a);
        uint256 before = token.balanceOf(a);
        vm.prank(a);
        vault.claim(seasonId);
        uint256 got = token.balanceOf(a) - before;
        assertEq(got, p + b + bonus);
        ghostBonusPaid += bonus;
        ghostTotalPaid += got;
        if (!vault.getSeason(seasonId).shortfall && got < principal) ghostUnderpaid += 1;
    }
}

contract InvariantTest is StdInvariant, Test {
    MockUSD internal token;
    MockYieldStrategy internal strategy;
    SeasonVault internal vault;
    GameManager internal game;
    Handler internal handler;

    function setUp() public {
        vm.warp(1_700_000_000);
        uint64 t0 = uint64(block.timestamp);
        address admin = address(this);
        address keeper = makeAddr("keeper");

        token = new MockUSD(admin);
        strategy = new MockYieldStrategy(token, 17_520_000, admin);
        vault = new SeasonVault(token, strategy, makeAddr("treasury"), admin);
        game = new GameManager(ISeasonVault(address(vault)), 2, admin);
        token.grantRole(token.MINTER_ROLE(), address(strategy));
        strategy.setVault(address(vault));
        vault.setGame(game);
        game.grantRole(game.RESULT_POSTER_ROLE(), keeper);
        uint256 id = vault.createSeason(t0, t0 + 1 hours, t0 + 1 days);

        handler = new Handler(token, vault, game, keeper, id);
        token.grantRole(token.MINTER_ROLE(), address(handler));
        targetContract(address(handler));
    }

    /// Late points can never push bonus claims past the pot.
    function invariant_BonusClaimsWithinPot() public view {
        uint256 id = handler.seasonId();
        if (vault.seasonStatus(id) != ISeasonVault.Status.Finalized) return;
        assertLe(handler.ghostBonusPaid(), vault.getSeason(id).bonusPot);
    }

    /// The finalize snapshot always equals the live weighted total, so claims add up.
    function invariant_SnapshotMatchesLiveTotal() public view {
        uint256 id = handler.seasonId();
        if (vault.seasonStatus(id) != ISeasonVault.Status.Finalized) return;
        assertEq(vault.getSeason(id).totalWeightedPoints, game.seasonTotalWeighted(id));
    }

    function invariant_ClaimsWithinAllocation() public view {
        uint256 id = handler.seasonId();
        if (vault.seasonStatus(id) != ISeasonVault.Status.Finalized) return;
        SeasonVault.Season memory s = vault.getSeason(id);
        assertLe(handler.ghostTotalPaid(), s.returnedPrincipal + s.baseYield + s.bonusPot);
    }

    function invariant_VaultSolvent() public view {
        uint256 id = handler.seasonId();
        SeasonVault.Season memory s = vault.getSeason(id);
        if (s.status == ISeasonVault.Status.Finalized) {
            assertGe(token.balanceOf(address(vault)), s.returnedPrincipal + s.baseYield + s.bonusPot - s.paidOut);
        }
    }

    function invariant_EveryClaimantGetsPrincipal() public view {
        assertEq(handler.ghostUnderpaid(), 0);
    }

    function invariant_GameHoldsNoTokens() public view {
        assertEq(token.balanceOf(address(game)), 0);
        assertEq(token.allowance(address(game), address(vault)), 0);
    }
}
