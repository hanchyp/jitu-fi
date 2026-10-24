// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice What the game reads from the vault.
interface ISeasonVault {
    enum Status {
        None,
        Enrollment,
        Active,
        Finalized
    }

    function activeSeasonOf(address user) external view returns (uint256);

    function principalOf(uint256 seasonId, address user) external view returns (uint256);

    function weightOf(uint256 seasonId, address user) external view returns (uint256);

    function isEligible(uint256 seasonId, address user) external view returns (bool);

    function seasonEnd(uint256 seasonId) external view returns (uint64);

    function seasonStatus(uint256 seasonId) external view returns (Status);
}
