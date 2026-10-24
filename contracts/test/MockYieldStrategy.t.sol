// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";
import {MockYieldStrategy} from "../src/mocks/MockYieldStrategy.sol";

contract MockYieldStrategyTest is Test {
    MockUSD internal token;
    MockYieldStrategy internal strategy;
    address internal admin = makeAddr("admin");
    address internal vault = makeAddr("vault");

    function setUp() public {
        vm.warp(1_700_000_000);
        token = new MockUSD(admin);
        strategy = new MockYieldStrategy(token, 1_000, admin);
        vm.startPrank(admin);
        token.grantRole(token.MINTER_ROLE(), address(strategy));
        token.grantRole(token.MINTER_ROLE(), admin);
        token.mint(vault, 10_000e6);
        strategy.setVault(vault);
        vm.stopPrank();
        vm.prank(vault);
        token.approve(address(strategy), type(uint256).max);
    }

    function test_AccrualOneYearAtTenPercent() public {
        vm.prank(vault);
        strategy.deposit(1, 1_000e6);
        vm.warp(block.timestamp + 365 days);
        assertEq(strategy.totalAssets(1), 1_100e6);
    }

    function test_WithdrawAllMintsYield() public {
        vm.prank(vault);
        strategy.deposit(1, 1_000e6);
        vm.warp(block.timestamp + 365 days);
        vm.prank(vault);
        uint256 out = strategy.withdrawAll(1);
        assertEq(out, 1_100e6);
        assertEq(token.balanceOf(vault), 9_000e6 + 1_100e6);
        assertEq(strategy.totalAssets(1), 0);
    }

    function test_SeasonsAreIsolated() public {
        vm.startPrank(vault);
        strategy.deposit(1, 1_000e6);
        strategy.deposit(2, 3_000e6);
        vm.warp(block.timestamp + 365 days);
        uint256 out1 = strategy.withdrawAll(1);
        vm.stopPrank();
        assertEq(out1, 1_100e6);
        assertEq(strategy.totalAssets(2), 3_300e6);
        assertEq(token.balanceOf(address(strategy)), 3_000e6);
    }

    function test_SecondDepositKeepsAccrued() public {
        vm.startPrank(vault);
        strategy.deposit(1, 1_000e6);
        vm.warp(block.timestamp + 365 days);
        strategy.deposit(1, 1_000e6);
        vm.stopPrank();
        assertEq(strategy.totalAssets(1), 2_100e6);
    }

    function test_DemoAprIsAboutTenPercentPerHalfHour() public {
        vm.prank(admin);
        strategy.setAprBps(17_520_000);
        vm.prank(vault);
        strategy.deposit(1, 1_000e6);
        vm.warp(block.timestamp + 30 minutes);
        assertEq(strategy.totalAssets(1), 1_100e6);
    }

    function test_OnlyVault() public {
        vm.expectRevert(MockYieldStrategy.OnlyVault.selector);
        strategy.deposit(1, 1);
        vm.expectRevert(MockYieldStrategy.OnlyVault.selector);
        strategy.withdrawAll(1);
    }

    function test_VaultSetOnce() public {
        vm.prank(admin);
        vm.expectRevert(MockYieldStrategy.VaultAlreadySet.selector);
        strategy.setVault(address(1));
    }

    function test_OnlyAdminSetsApr() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, address(this), strategy.DEFAULT_ADMIN_ROLE()
            )
        );
        strategy.setAprBps(1);
    }
}
