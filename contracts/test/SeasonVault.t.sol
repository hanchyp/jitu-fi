// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {BaseTest, PointsStub} from "./Base.t.sol";
import {SeasonVault} from "../src/SeasonVault.sol";
import {ISeasonVault} from "../src/interfaces/ISeasonVault.sol";
import {IYieldStrategy} from "../src/interfaces/IYieldStrategy.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";

/// @dev Strategy that loses 10% of whatever it holds.
contract LossyStrategy is IYieldStrategy {
    IERC20 public immutable token;
    mapping(uint256 => uint256) public held;

    constructor(IERC20 token_) {
        token = token_;
    }

    function asset() external view returns (address) {
        return address(token);
    }

    function deposit(uint256 seasonId, uint256 amount) external {
        held[seasonId] += amount;
        token.transferFrom(msg.sender, address(this), amount);
    }

    function withdrawAll(uint256 seasonId) external returns (uint256 amount) {
        amount = (held[seasonId] * 9) / 10;
        held[seasonId] = 0;
        token.transfer(msg.sender, amount);
    }

    function totalAssets(uint256 seasonId) external view returns (uint256) {
        return (held[seasonId] * 9) / 10;
    }
}

contract SeasonVaultTest is BaseTest {
    PointsStub internal points;

    function setUp() public {
        _deployCore();
        points = new PointsStub();
        vm.prank(admin);
        vault.setGame(points);
    }

    // ---------------------------------------------------------------- seasons

    function test_CreateSeasonsForTwoTenors() public {
        vm.startPrank(admin);
        uint256 week = vault.createSeason(t0, t0 + 2 minutes, t0 + 15 minutes);
        uint256 month = vault.createSeason(t0, t0 + 2 minutes, t0 + 30 minutes);
        vm.stopPrank();
        assertEq(week, 1);
        assertEq(month, 2);
        assertEq(uint8(vault.seasonStatus(week)), uint8(ISeasonVault.Status.Enrollment));
        assertEq(uint8(vault.seasonStatus(month)), uint8(ISeasonVault.Status.Enrollment));
    }

    function test_CreateSeasonInvalidOrderReverts() public {
        vm.startPrank(admin);
        vm.expectRevert(SeasonVault.InvalidSchedule.selector);
        vault.createSeason(t0, t0 + 1 hours, t0 + 1 hours);
        vm.expectRevert(SeasonVault.InvalidSchedule.selector);
        vault.createSeason(t0 + 1 hours, t0 + 1 hours, t0 + 2 hours);
        vm.stopPrank();
    }

    function test_OnlySeasonManagerCreates() public {
        vm.expectRevert();
        vm.prank(alice);
        vault.createSeason(t0, t0 + 1, t0 + 2);
    }

    // ---------------------------------------------------------------- deposits

    function test_DepositAccepted() public {
        uint256 id = _createYearSeason();
        _deposit(alice, id, 100e6);
        assertEq(vault.principalOf(id, alice), 100e6);
        assertEq(vault.getSeason(id).totalPrincipal, 100e6);
        assertEq(vault.activeSeasonOf(alice), id);
        assertEq(token.balanceOf(address(vault)), 100e6);
    }

    function test_DepositsAccumulate() public {
        uint256 id = _createYearSeason();
        _deposit(alice, id, 100e6);
        _deposit(alice, id, 50e6);
        assertEq(vault.principalOf(id, alice), 150e6);
        assertEq(vault.getSeason(id).depositors, 1);
    }

    function test_DepositAfterStartReverts() public {
        uint256 id = _createYearSeason();
        _fund(alice, 100e6);
        vm.warp(t0 + 1 hours);
        vm.expectRevert(SeasonVault.NotEnrolling.selector);
        vm.prank(alice);
        vault.deposit(id, 100e6);
    }

    function test_DepositBelowMinimumReverts() public {
        uint256 id = _createYearSeason();
        _fund(alice, 5e6);
        vm.expectRevert(SeasonVault.BelowMinimum.selector);
        vm.prank(alice);
        vault.deposit(id, 5e6);
    }

    function test_SecondTenorReverts() public {
        uint256 week = _createYearSeason();
        uint256 month = _createYearSeason();
        _deposit(alice, week, 100e6);
        vm.expectRevert(abi.encodeWithSelector(SeasonVault.OtherSeasonOpen.selector, week));
        vm.prank(alice);
        vault.deposit(month, 100e6);
    }

    function test_NewSeasonAfterFinalized() public {
        uint256 first = _createYearSeason();
        _deposit(alice, first, 100e6);
        vm.warp(t0 + 1 hours + 365 days);
        vault.finalize(first);

        vm.prank(admin);
        uint64 now_ = uint64(block.timestamp);
        uint256 second = vault.createSeason(now_, now_ + 1 hours, now_ + 2 hours);
        _deposit(alice, second, 100e6);
        assertEq(vault.activeSeasonOf(alice), second);
    }

    function test_DepositWithPermitRelayed() public {
        uint256 id = _createYearSeason();
        (address owner, uint256 key) = makeAddrAndKey("permitOwner");
        vm.prank(admin);
        token.mint(owner, 200e6);
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(owner, key, 200e6, deadline);

        address relayer = makeAddr("relayer");
        vm.prank(relayer);
        vault.depositWithPermit(id, owner, 200e6, deadline, v, r, s);

        assertEq(vault.principalOf(id, owner), 200e6);
        assertEq(vault.principalOf(id, relayer), 0);
        assertEq(token.balanceOf(relayer), 0);
    }

    function test_WeightCap() public {
        uint256 id = _createYearSeason();
        _deposit(alice, id, 5_000e6);
        _deposit(bob, id, 400e6);
        assertEq(vault.weightOf(id, alice), 1_000e6);
        assertEq(vault.weightOf(id, bob), 400e6);
    }

    // ---------------------------------------------------------------- activation

    function test_ActivateEarlyReverts() public {
        uint256 id = _createYearSeason();
        vm.expectRevert(SeasonVault.TooEarly.selector);
        vault.activate(id);
    }

    function test_ActivateMovesPrincipalAndEnablesEligibility() public {
        uint256 id = _createYearSeason();
        _deposit(alice, id, 1_000e6);
        assertFalse(vault.isEligible(id, alice));
        vm.warp(t0 + 1 hours);
        vault.activate(id);
        assertEq(token.balanceOf(address(strategy)), 1_000e6);
        assertTrue(vault.isEligible(id, alice));
        assertFalse(vault.isEligible(id, bob));
        vm.expectRevert(abi.encodeWithSelector(SeasonVault.WrongStatus.selector, ISeasonVault.Status.Active));
        vault.activate(id);
    }

    // ---------------------------------------------------------------- finalize

    function test_FinalizeEarlyReverts() public {
        uint256 id = _createYearSeason();
        _deposit(alice, id, 1_000e6);
        vm.warp(t0 + 1 hours);
        vault.activate(id);
        vm.expectRevert(SeasonVault.TooEarly.selector);
        vault.finalize(id);
    }

    function test_NormalYieldSplit() public {
        uint256 id = _runYearSeason(0);
        SeasonVault.Season memory s = vault.getSeason(id);
        assertEq(s.fee, 15e6);
        assertEq(s.baseYield, 42_500_000);
        assertEq(s.bonusPot, 42_500_000);
        assertEq(token.balanceOf(treasury), 15e6);
        assertFalse(s.shortfall);
    }

    function test_SponsorFundsJoinBonusPot() public {
        uint256 id = _runYearSeason(1_000e6);
        SeasonVault.Season memory s = vault.getSeason(id);
        assertEq(s.fee, 15e6);
        assertEq(s.baseYield, 42_500_000);
        assertEq(s.bonusPot, 1_042_500_000);
    }

    function test_NoPointsMovesBonusToBase() public {
        uint256 id = _createYearSeason();
        _deposit(alice, id, 1_000e6);
        vm.warp(t0 + 1 hours);
        vault.activate(id);
        vm.warp(t0 + 1 hours + 365 days);
        vault.finalize(id);
        SeasonVault.Season memory s = vault.getSeason(id);
        assertEq(s.baseYield, 85e6);
        assertEq(s.bonusPot, 0);
        vm.prank(alice);
        vault.claim(id);
        assertEq(token.balanceOf(alice), 1_085e6);
    }

    function test_FinalizeActivatesIfNobodyDid() public {
        uint256 id = _createYearSeason();
        _deposit(alice, id, 1_000e6);
        vm.warp(t0 + 1 hours + 365 days);
        vault.finalize(id);
        assertEq(uint8(vault.seasonStatus(id)), uint8(ISeasonVault.Status.Finalized));
        vm.prank(alice);
        vault.claim(id);
        assertEq(token.balanceOf(alice), 1_000e6);
    }

    function test_Shortfall() public {
        LossyStrategy lossy = new LossyStrategy(token);
        SeasonVault v = new SeasonVault(token, lossy, treasury, admin);
        vm.startPrank(admin);
        v.setGame(points);
        uint256 id = v.createSeason(t0, t0 + 1 hours, t0 + 2 hours);
        token.mint(alice, 100e6);
        token.mint(bob, 900e6);
        token.mint(sponsor, 50e6);
        vm.stopPrank();
        _approveAndDeposit(v, alice, id, 100e6);
        _approveAndDeposit(v, bob, id, 900e6);
        vm.startPrank(sponsor);
        token.approve(address(v), 50e6);
        v.fundBonus(id, 50e6);
        vm.stopPrank();
        points.set(id, alice, 100, v.weightOf(id, alice));

        vm.warp(t0 + 1 hours);
        v.activate(id);
        vm.warp(t0 + 2 hours);
        vm.expectEmit(true, false, false, true, address(v));
        emit SeasonVault.Shortfall(id, 900e6, 1_000e6);
        v.finalize(id);

        SeasonVault.Season memory s = v.getSeason(id);
        assertTrue(s.shortfall);
        assertEq(s.fee, 0);
        assertEq(s.baseYield, 0);
        assertEq(s.bonusPot, 50e6);
        assertEq(token.balanceOf(treasury), 0);

        vm.prank(alice);
        v.claim(id);
        assertEq(token.balanceOf(alice), 90e6 + 50e6); // pro-rata principal + the whole sponsor pot
        vm.prank(bob);
        v.claim(id);
        assertEq(token.balanceOf(bob), 810e6);
    }

    function test_FundBonusAfterFinalizeReverts() public {
        uint256 id = _runYearSeason(0);
        _fund(sponsor, 1e6);
        vm.expectRevert(abi.encodeWithSelector(SeasonVault.WrongStatus.selector, ISeasonVault.Status.Finalized));
        vm.prank(sponsor);
        vault.fundBonus(id, 1e6);
    }

    // ---------------------------------------------------------------- claims

    function test_ClaimPaysPrincipalBaseAndBonus() public {
        uint256 id = _createYearSeason();
        _deposit(alice, id, 1_000e6);
        _deposit(bob, id, 1_000e6);
        points.set(id, alice, 300, 1_000e6);
        points.set(id, bob, 100, 1_000e6);
        vm.warp(t0 + 1 hours);
        vault.activate(id);
        vm.warp(t0 + 1 hours + 365 days);
        vault.finalize(id);
        // yield 200 → fee 30, base 85, bonus 85 → alice 3/4, bob 1/4 of the bonus
        (uint256 p, uint256 b, uint256 bonus) = vault.previewClaim(id, alice);
        assertEq(p, 1_000e6);
        assertEq(b, 42_500_000);
        assertEq(bonus, 63_750_000);

        vm.prank(alice);
        vault.claim(id);
        assertEq(token.balanceOf(alice), p + b + bonus);
        vm.prank(bob);
        vault.claim(id);
        assertEq(token.balanceOf(bob), 1_000e6 + 42_500_000 + 21_250_000);
    }

    function test_DoubleClaimReverts() public {
        uint256 id = _runYearSeason(0);
        vm.startPrank(alice);
        vault.claim(id);
        vm.expectRevert(SeasonVault.AlreadyClaimed.selector);
        vault.claim(id);
        vm.stopPrank();
    }

    function test_ClaimBeforeFinalizeReverts() public {
        uint256 id = _createYearSeason();
        _deposit(alice, id, 1_000e6);
        vm.warp(t0 + 1 hours);
        vault.activate(id);
        vm.expectRevert(abi.encodeWithSelector(SeasonVault.WrongStatus.selector, ISeasonVault.Status.Active));
        vm.prank(alice);
        vault.claim(id);
    }

    function test_ClaimWithoutPositionReverts() public {
        uint256 id = _runYearSeason(0);
        vm.expectRevert(SeasonVault.NothingToClaim.selector);
        vm.prank(carol);
        vault.claim(id);
    }

    function test_ClaimWorksWhilePaused() public {
        uint256 id = _runYearSeason(0);
        vm.prank(admin);
        vault.pause();
        vm.prank(alice);
        vault.claim(id);
        assertGt(token.balanceOf(alice), 1_000e6);
    }

    function test_DepositWhilePausedReverts() public {
        uint256 id = _createYearSeason();
        _fund(alice, 100e6);
        vm.prank(admin);
        vault.pause();
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(alice);
        vault.deposit(id, 100e6);
    }

    function test_PreviewBeforeFinalizeEstimates() public {
        uint256 id = _createYearSeason();
        _deposit(alice, id, 1_000e6);
        points.set(id, alice, 100, 1_000e6);
        vm.warp(t0 + 1 hours);
        vault.activate(id);
        vm.warp(t0 + 1 hours + 365 days);
        (uint256 p, uint256 b, uint256 bonus) = vault.previewClaim(id, alice);
        assertEq(p + b + bonus, 1_085e6);
    }

    // ---------------------------------------------------------------- dust

    function test_SweepBeforeAllClaimedReverts() public {
        uint256 id = _runYearSeason(0);
        vm.expectRevert(SeasonVault.UnclaimedPositions.selector);
        vm.prank(admin);
        vault.sweepDust(id, admin);
    }

    function test_SweepAfterAllClaimed() public {
        uint256 id = _createYearSeason();
        _deposit(alice, id, 1_000e6);
        _deposit(bob, id, 1_000e6);
        _deposit(carol, id, 1_000e6);
        points.set(id, alice, 1, 1_000e6);
        points.set(id, bob, 1, 1_000e6);
        points.set(id, carol, 1, 1_000e6);
        vm.warp(t0 + 1 hours);
        vault.activate(id);
        vm.warp(t0 + 1 hours + 365 days);
        vault.finalize(id);
        vm.prank(alice);
        vault.claim(id);
        vm.prank(bob);
        vault.claim(id);
        vm.prank(carol);
        vault.claim(id);
        uint256 left = token.balanceOf(address(vault));
        vm.prank(admin);
        vault.sweepDust(id, admin);
        assertEq(token.balanceOf(admin), left);
        assertEq(token.balanceOf(address(vault)), 0);
    }

    // ---------------------------------------------------------------- helpers

    /// @dev alice deposits 1,000 at 10% for a year with points; optional sponsor funding. Finalized.
    function _runYearSeason(uint256 sponsorAmount) internal returns (uint256 id) {
        id = _createYearSeason();
        _deposit(alice, id, 1_000e6);
        points.set(id, alice, 100, 1_000e6);
        if (sponsorAmount > 0) {
            _fund(sponsor, sponsorAmount);
            vm.prank(sponsor);
            vault.fundBonus(id, sponsorAmount);
        }
        vm.warp(t0 + 1 hours);
        vault.activate(id);
        vm.warp(t0 + 1 hours + 365 days);
        vault.finalize(id);
    }

    function _approveAndDeposit(SeasonVault v, address who, uint256 id, uint256 amount) internal {
        vm.startPrank(who);
        token.approve(address(v), amount);
        v.deposit(id, amount);
        vm.stopPrank();
    }

    function _signPermit(address owner, uint256 key, uint256 value, uint256 deadline)
        internal
        view
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                address(vault),
                value,
                MockUSD(address(token)).nonces(owner),
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
        (v, r, s) = vm.sign(key, digest);
    }
}
