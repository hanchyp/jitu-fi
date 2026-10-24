// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";

contract MockUSDTest is Test {
    MockUSD internal token;
    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");

    function setUp() public {
        vm.warp(1_700_000_000);
        token = new MockUSD(admin);
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Mock USD");
        assertEq(token.symbol(), "mUSD");
        assertEq(token.decimals(), 6);
    }

    function test_FaucetMintsThousand() public {
        vm.prank(alice);
        token.faucet();
        assertEq(token.balanceOf(alice), 1_000_000_000);
    }

    function test_FaucetCooldown() public {
        vm.startPrank(alice);
        token.faucet();
        vm.warp(block.timestamp + 59 minutes);
        vm.expectRevert(abi.encodeWithSelector(MockUSD.FaucetCooldown.selector, block.timestamp + 1 minutes));
        token.faucet();
        vm.warp(block.timestamp + 1 minutes);
        token.faucet();
        vm.stopPrank();
        assertEq(token.balanceOf(alice), 2_000e6);
    }

    function test_UnauthorizedMintReverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, alice, token.MINTER_ROLE())
        );
        vm.prank(alice);
        token.mint(alice, 1);
    }

    function test_MinterCanMint() public {
        bytes32 role = token.MINTER_ROLE();
        vm.prank(admin);
        token.grantRole(role, alice);
        vm.prank(alice);
        token.mint(alice, 5e6);
        assertEq(token.balanceOf(alice), 5e6);
    }

    function test_Permit() public {
        (address owner, uint256 key) = makeAddrAndKey("owner");
        address spender = makeAddr("spender");
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                spender,
                100e6,
                token.nonces(owner),
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        token.permit(owner, spender, 100e6, deadline, v, r, s);
        assertEq(token.allowance(owner, spender), 100e6);
    }
}
