// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {BaseTest} from "./Base.t.sol";
import {GameManager} from "../src/GameManager.sol";
import {ISeasonVault} from "../src/interfaces/ISeasonVault.sol";
import {SeasonVault} from "../src/SeasonVault.sol";

contract GameManagerTest is BaseTest {
    GameManager internal game;
    address internal keeper = makeAddr("keeper");
    address internal bot = makeAddr("bot");
    uint256 internal id;
    uint256 internal nonce;

    function setUp() public {
        _deployCore();
        game = new GameManager(ISeasonVault(address(vault)), 2, admin);
        vm.startPrank(admin);
        vault.setGame(game);
        game.grantRole(game.RESULT_POSTER_ROLE(), keeper);
        vm.stopPrank();

        id = _createYearSeason();
        _deposit(alice, id, 1_000e6);
        _deposit(bob, id, 400e6);
        vm.warp(t0 + 1 hours);
        vault.activate(id);
    }

    function test_RecordCreditsPointsAndWeight() public {
        bytes32 gid = _record(alice, 150);
        assertTrue(game.recorded(gid));
        assertEq(game.seasonPoints(id, alice), 150);
        assertEq(game.gamesCounted(id, alice), 1);
        assertEq(game.seasonTotalWeighted(id), 150 * 1_000e6);

        _record(bob, 100);
        assertEq(game.seasonTotalWeighted(id), 150 * 1_000e6 + 100 * 400e6);
    }

    function test_EmitsGameRecorded() public {
        bytes32 gid = keccak256("g1");
        vm.expectEmit(true, true, true, true, address(game));
        emit GameManager.GameRecorded(gid, alice, id, 42, 42, keccak256("log"));
        vm.prank(keeper);
        game.recordGame(gid, alice, 42, keccak256("log"));
    }

    function test_OnlyPoster() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, game.RESULT_POSTER_ROLE()
            )
        );
        vm.prank(alice);
        game.recordGame(keccak256("g"), alice, 10, bytes32(0));
    }

    function test_DuplicateGameReverts() public {
        vm.startPrank(keeper);
        game.recordGame(keccak256("g"), alice, 10, bytes32(0));
        vm.expectRevert(GameManager.AlreadyRecorded.selector);
        game.recordGame(keccak256("g"), alice, 10, bytes32(0));
        vm.stopPrank();
    }

    function test_ScoreBound() public {
        vm.startPrank(keeper);
        vm.expectRevert(GameManager.ScoreTooHigh.selector);
        game.recordGame(keccak256("g"), alice, 50_000, bytes32(0));
        game.recordGame(keccak256("g2"), alice, 10_000, bytes32(0));
        vm.stopPrank();
        assertEq(game.seasonPoints(id, alice), 10_000);
    }

    function test_BotCannotBeRecorded() public {
        vm.expectRevert(GameManager.NoPosition.selector);
        vm.prank(keeper);
        game.recordGame(keccak256("g"), bot, 100, bytes32(0));
    }

    function test_NegativeGameCountsTowardK() public {
        _record(alice, -40);
        assertEq(game.seasonPoints(id, alice), 0);
        assertEq(game.gamesCounted(id, alice), 1);
        assertEq(game.seasonTotalWeighted(id), 0);
    }

    function test_OnlyFirstKGamesCount() public {
        _record(alice, 100);
        _record(alice, 50);
        bytes32 third = keccak256(abi.encode("third"));
        vm.expectEmit(true, true, true, true, address(game));
        emit GameManager.GameRecorded(third, alice, id, 500, 0, bytes32(0));
        vm.prank(keeper);
        game.recordGame(third, alice, 500, bytes32(0));
        assertEq(game.seasonPoints(id, alice), 150);
        assertEq(game.gamesCounted(id, alice), 2);
    }

    function test_RecordDuringEnrollmentReverts() public {
        vm.prank(admin);
        uint64 now_ = uint64(block.timestamp);
        uint256 next = vault.createSeason(now_, now_ + 1 hours, now_ + 2 hours);
        _deposit(carol, next, 100e6);
        vm.expectRevert(GameManager.SeasonNotActive.selector);
        vm.prank(keeper);
        game.recordGame(keccak256("g"), carol, 100, bytes32(0));
    }

    function test_LateRecordSkipsPoints() public {
        vm.warp(t0 + 1 hours + 365 days); // == season end
        bytes32 gid = keccak256("late");
        vm.expectEmit(true, true, true, true, address(game));
        emit GameManager.PointsSkipped(gid, alice, id, 300);
        vm.prank(keeper);
        game.recordGame(gid, alice, 300, bytes32(0));
        assertEq(game.seasonPoints(id, alice), 0);
        assertEq(game.seasonTotalWeighted(id), 0);
        assertEq(game.gamesCounted(id, alice), 0);
        assertTrue(game.recorded(gid));
    }

    function test_RecordAfterFinalizeSkipsPoints() public {
        _record(alice, 100);
        vm.warp(t0 + 1 hours + 365 days);
        vault.finalize(id);
        uint256 snapshot = vault.getSeason(id).totalWeightedPoints;
        _record(alice, 900);
        assertEq(game.seasonTotalWeighted(id), snapshot);
        assertEq(game.seasonPoints(id, alice), 100);
    }

    function test_FullScenario() public {
        _fund(sponsor, 1_000e6);
        vm.prank(sponsor);
        vault.fundBonus(id, 1_000e6);

        _record(alice, 120); // weighted 120 × 1,000
        _record(bob, 300); // weighted 300 × 400 = same weighted total as alice
        _record(bob, -50);

        vm.warp(t0 + 1 hours + 365 days);
        vault.finalize(id);
        SeasonVault.Season memory s = vault.getSeason(id);
        // principal 1,400 at 10% → yield 140: fee 21, base 59.5, bonus 59.5 + 1,000 sponsor
        assertEq(s.fee, 21e6);
        assertEq(s.baseYield, 59_500_000);
        assertEq(s.bonusPot, 1_059_500_000);

        vm.prank(alice);
        vault.claim(id);
        vm.prank(bob);
        vault.claim(id);
        uint256 aliceBase = (59_500_000 * 1_000e6) / 1_400e6;
        uint256 bobBase = (59_500_000 * 400e6) / 1_400e6;
        assertEq(token.balanceOf(alice), 1_000e6 + aliceBase + 529_750_000);
        assertEq(token.balanceOf(bob), 400e6 + bobBase + 529_750_000);
        assertLe(token.balanceOf(alice) + token.balanceOf(bob), 1_400e6 + 140e6 - 21e6 + 1_000e6);
        assertEq(token.balanceOf(address(game)), 0);
    }

    function _record(address player, int256 score) internal returns (bytes32 gid) {
        gid = keccak256(abi.encode(player, nonce++));
        vm.prank(keeper);
        game.recordGame(gid, player, score, bytes32(0));
    }
}
