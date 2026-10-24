// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IYieldStrategy} from "../interfaces/IYieldStrategy.sol";
import {MockUSD} from "./MockUSD.sol";

/// @title MockYieldStrategy
/// @notice Simulates a lending strategy: each season's principal accrues simple interest at
/// `aprBps`, minted as mUSD on withdrawal. Testnet only.
contract MockYieldStrategy is IYieldStrategy, AccessControl {
    using SafeERC20 for IERC20;

    struct Account {
        uint256 principal;
        uint256 accrued;
        uint64 lastAccrual;
    }

    uint256 private constant BPS = 10_000;
    uint256 private constant YEAR = 365 days;

    MockUSD public immutable token;
    address public vault;
    uint256 public aprBps;

    mapping(uint256 seasonId => Account) public accounts;

    event VaultSet(address vault);
    event AprSet(uint256 aprBps);
    event Deposited(uint256 indexed seasonId, uint256 amount);
    event Withdrawn(uint256 indexed seasonId, uint256 amount);

    error OnlyVault();
    error VaultAlreadySet();

    modifier onlyVault() {
        if (msg.sender != vault) revert OnlyVault();
        _;
    }

    constructor(MockUSD token_, uint256 aprBps_, address admin) {
        token = token_;
        aprBps = aprBps_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setVault(address vault_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (vault != address(0)) revert VaultAlreadySet();
        vault = vault_;
        emit VaultSet(vault_);
    }

    /// @dev Changing the APR does not re-price interest already accrued.
    function setAprBps(uint256 aprBps_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        aprBps = aprBps_;
        emit AprSet(aprBps_);
    }

    function asset() external view returns (address) {
        return address(token);
    }

    function deposit(uint256 seasonId, uint256 amount) external onlyVault {
        Account storage a = accounts[seasonId];
        a.accrued += _pending(a);
        a.lastAccrual = uint64(block.timestamp);
        a.principal += amount;
        IERC20(address(token)).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(seasonId, amount);
    }

    function withdrawAll(uint256 seasonId) external onlyVault returns (uint256 amount) {
        Account storage a = accounts[seasonId];
        uint256 yield_ = a.accrued + _pending(a);
        amount = a.principal + yield_;
        delete accounts[seasonId];
        if (yield_ > 0) token.mint(address(this), yield_);
        if (amount > 0) IERC20(address(token)).safeTransfer(msg.sender, amount);
        emit Withdrawn(seasonId, amount);
    }

    function totalAssets(uint256 seasonId) external view returns (uint256) {
        Account storage a = accounts[seasonId];
        return a.principal + a.accrued + _pending(a);
    }

    function _pending(Account storage a) private view returns (uint256) {
        if (a.principal == 0) return 0;
        return (a.principal * aprBps * (block.timestamp - a.lastAccrual)) / (BPS * YEAR);
    }
}
