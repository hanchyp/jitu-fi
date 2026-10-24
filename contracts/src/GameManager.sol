// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IPointsSource} from "./interfaces/IPointsSource.sol";
import {ISeasonVault} from "./interfaces/ISeasonVault.sol";

/// @title GameManager
/// @notice Records one result per finished Crypto Draft game and turns it into season points.
/// The game itself runs in the backend; this contract keeps the money rules on-chain: first-K
/// games, max(0, score), a score bound and the end-of-season cutoff. It never touches tokens.
contract GameManager is IPointsSource, AccessControl {
    bytes32 public constant RESULT_POSTER_ROLE = keccak256("RESULT_POSTER_ROLE");

    /// @notice Highest accepted game score, in bps. Limits what a leaked poster key can do.
    int256 public constant MAX_GAME_SCORE = 10_000;

    ISeasonVault public immutable vault;
    /// @notice Games per player per season that earn points (5, or 2 in demo mode).
    uint256 public immutable pointsK;

    mapping(bytes32 gameId => bool) public recorded;
    mapping(uint256 seasonId => mapping(address player => uint256)) public gamesCounted;
    mapping(uint256 seasonId => mapping(address player => uint256)) public seasonPoints;
    mapping(uint256 seasonId => uint256) public seasonTotalWeighted;

    event GameRecorded(
        bytes32 indexed gameId,
        address indexed player,
        uint256 indexed seasonId,
        int256 gameScore,
        uint256 credited,
        bytes32 logHash
    );
    event PointsSkipped(bytes32 indexed gameId, address indexed player, uint256 indexed seasonId, int256 gameScore);

    error AlreadyRecorded();
    error ScoreTooHigh();
    error NoPosition();
    error SeasonNotActive();
    error InvalidK();

    constructor(ISeasonVault vault_, uint256 pointsK_, address admin) {
        if (pointsK_ == 0) revert InvalidK();
        vault = vault_;
        pointsK = pointsK_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Records a finished game for its human seat. Bots have no position and can't be recorded.
    /// @param gameScore Σ round scores ÷ Σ caps, in bps.
    /// @param logHash keccak256 of the full game log the backend serves for audit.
    function recordGame(bytes32 gameId, address player, int256 gameScore, bytes32 logHash)
        external
        onlyRole(RESULT_POSTER_ROLE)
    {
        if (recorded[gameId]) revert AlreadyRecorded();
        if (gameScore > MAX_GAME_SCORE) revert ScoreTooHigh();
        uint256 seasonId = vault.activeSeasonOf(player);
        if (seasonId == 0 || vault.principalOf(seasonId, player) == 0) revert NoPosition();
        recorded[gameId] = true;

        // Cutoff: points after the season ends would let claims exceed the bonus pot.
        ISeasonVault.Status status = vault.seasonStatus(seasonId);
        if (block.timestamp >= vault.seasonEnd(seasonId) || status == ISeasonVault.Status.Finalized) {
            emit PointsSkipped(gameId, player, seasonId, gameScore);
            return;
        }
        if (status != ISeasonVault.Status.Active) revert SeasonNotActive();

        uint256 credited;
        if (gamesCounted[seasonId][player] < pointsK) {
            gamesCounted[seasonId][player] += 1;
            if (gameScore > 0) {
                credited = uint256(gameScore);
                seasonPoints[seasonId][player] += credited;
                seasonTotalWeighted[seasonId] += credited * vault.weightOf(seasonId, player);
            }
        }
        emit GameRecorded(gameId, player, seasonId, gameScore, credited, logHash);
    }
}
