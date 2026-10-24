// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Where the vault parks a season's principal. Accounts are keyed by season id so
/// concurrent seasons never withdraw each other's funds.
interface IYieldStrategy {
    function asset() external view returns (address);

    /// @dev Pulls `amount` of `asset()` from the vault into the season's account.
    function deposit(uint256 seasonId, uint256 amount) external;

    /// @dev Sends the season's whole balance (principal + yield) to the vault and returns it.
    function withdrawAll(uint256 seasonId) external returns (uint256 amount);

    function totalAssets(uint256 seasonId) external view returns (uint256);
}
