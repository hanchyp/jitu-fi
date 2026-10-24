// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice What the vault reads from the game: season points and their weighted total.
interface IPointsSource {
    function seasonPoints(uint256 seasonId, address player) external view returns (uint256);

    /// @dev Σ points × weight over every player of the season.
    function seasonTotalWeighted(uint256 seasonId) external view returns (uint256);
}
