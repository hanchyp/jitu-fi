// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";
import {MockYieldStrategy} from "../src/mocks/MockYieldStrategy.sol";
import {SeasonVault} from "../src/SeasonVault.sol";
import {IPointsSource} from "../src/interfaces/IPointsSource.sol";

/// @dev Points source the tests can set directly.
contract PointsStub is IPointsSource {
    mapping(uint256 => mapping(address => uint256)) public seasonPoints;
    mapping(uint256 => uint256) public seasonTotalWeighted;

    function set(uint256 seasonId, address player, uint256 points, uint256 weight) external {
        seasonTotalWeighted[seasonId] = seasonTotalWeighted[seasonId] - seasonPoints[seasonId][player] * weight
            + points * weight;
        seasonPoints[seasonId][player] = points;
    }
}

abstract contract BaseTest is Test {
    uint256 internal constant APR_10 = 1_000; // 10% a year

    MockUSD internal token;
    MockYieldStrategy internal strategy;
    SeasonVault internal vault;

    address internal admin = makeAddr("admin");
    address internal treasury = makeAddr("treasury");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal sponsor = makeAddr("sponsor");

    uint64 internal t0;

    function _deployCore() internal {
        vm.warp(1_700_000_000);
        t0 = uint64(block.timestamp);
        token = new MockUSD(admin);
        strategy = new MockYieldStrategy(token, APR_10, admin);
        vault = new SeasonVault(token, strategy, treasury, admin);
        vm.startPrank(admin);
        token.grantRole(token.MINTER_ROLE(), address(strategy));
        token.grantRole(token.MINTER_ROLE(), admin);
        strategy.setVault(address(vault));
        vm.stopPrank();
    }

    function _fund(address who, uint256 amount) internal {
        vm.prank(admin);
        token.mint(who, amount);
        vm.prank(who);
        token.approve(address(vault), type(uint256).max);
    }

    /// @dev Season with enrollment [t0, t0+1h), active [t0+1h, t0+1h+365d).
    function _createYearSeason() internal returns (uint256 id) {
        vm.prank(admin);
        id = vault.createSeason(t0, t0 + 1 hours, t0 + 1 hours + 365 days);
    }

    function _deposit(address who, uint256 seasonId, uint256 amount) internal {
        _fund(who, amount);
        vm.prank(who);
        vault.deposit(seasonId, amount);
    }
}
