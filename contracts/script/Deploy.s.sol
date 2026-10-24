// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";
import {MockYieldStrategy} from "../src/mocks/MockYieldStrategy.sol";
import {SeasonVault} from "../src/SeasonVault.sol";
import {GameManager} from "../src/GameManager.sol";
import {ISeasonVault} from "../src/interfaces/ISeasonVault.sol";

/// @notice Deploys and wires the jitu.fi contracts, opens one demo season per tenor and seeds each
/// bonus pot. Testnet and local only.
///
/// Env (all optional): DEMO_MODE (default true), KEEPER_ADDRESS (default: deployer),
/// FEE_RECIPIENT (default: deployer), POINTS_K (default 2 in demo, else 5),
/// SPONSOR_AMOUNT (default 1,000 mUSD per season).
contract Deploy is Script {
    uint256 internal constant MONAD_MAINNET = 143;
    uint256 internal constant DEMO_APR_BPS = 17_520_000; // about 10% per 30 minutes, "simulated"
    uint256 internal constant APR_BPS = 500_000;

    struct Deployed {
        MockUSD token;
        MockYieldStrategy strategy;
        SeasonVault vault;
        GameManager game;
        uint256 weekSeason;
        uint256 monthSeason;
    }

    function run() external returns (Deployed memory d) {
        require(block.chainid != MONAD_MAINNET, "Deploy: never deploy to Monad mainnet");

        bool demo = vm.envOr("DEMO_MODE", true);
        vm.startBroadcast();
        (, address deployer,) = vm.readCallers();
        address keeper = vm.envOr("KEEPER_ADDRESS", deployer);
        address feeRecipient = vm.envOr("FEE_RECIPIENT", deployer);
        uint256 pointsK = vm.envOr("POINTS_K", demo ? uint256(2) : uint256(5));
        uint256 sponsorAmount = vm.envOr("SPONSOR_AMOUNT", uint256(1_000e6));

        d.token = new MockUSD(deployer);
        d.strategy = new MockYieldStrategy(d.token, demo ? DEMO_APR_BPS : APR_BPS, deployer);
        d.vault = new SeasonVault(d.token, d.strategy, feeRecipient, deployer);
        d.game = new GameManager(ISeasonVault(address(d.vault)), pointsK, deployer);

        bytes32 minter = d.token.MINTER_ROLE();
        d.token.grantRole(minter, address(d.strategy));
        d.token.grantRole(minter, deployer);
        d.token.grantRole(minter, keeper); // keeper seeds bonus pots of renewed demo seasons
        d.strategy.setVault(address(d.vault));
        d.vault.setGame(d.game);
        d.vault.grantRole(d.vault.SEASON_MANAGER_ROLE(), keeper);
        d.game.grantRole(d.game.RESULT_POSTER_ROLE(), keeper);

        // "1 week" and "1 month" tenors; in demo mode 15 and 30 minutes after a 2-minute enrollment.
        uint64 now_ = uint64(block.timestamp);
        uint64 start = now_ + (demo ? 2 minutes : 1 days);
        d.weekSeason = d.vault.createSeason(now_, start, start + (demo ? 15 minutes : 7 days));
        d.monthSeason = d.vault.createSeason(now_, start, start + (demo ? 30 minutes : 30 days));

        if (sponsorAmount > 0) {
            d.token.mint(deployer, 2 * sponsorAmount);
            d.token.approve(address(d.vault), 2 * sponsorAmount);
            d.vault.fundBonus(d.weekSeason, sponsorAmount);
            d.vault.fundBonus(d.monthSeason, sponsorAmount);
        }
        vm.stopBroadcast();

        _writeDeployment(d, deployer, keeper, demo, pointsK);
    }

    function _writeDeployment(Deployed memory d, address deployer, address keeper, bool demo, uint256 pointsK)
        internal
    {
        string memory k = "deployment";
        vm.serializeUint(k, "chainId", block.chainid);
        vm.serializeUint(k, "deployedAt", block.timestamp);
        vm.serializeUint(k, "deployBlock", block.number);
        vm.serializeBool(k, "demoMode", demo);
        vm.serializeUint(k, "pointsK", pointsK);
        vm.serializeAddress(k, "deployer", deployer);
        vm.serializeAddress(k, "keeper", keeper);
        vm.serializeAddress(k, "MockUSD", address(d.token));
        vm.serializeAddress(k, "MockYieldStrategy", address(d.strategy));
        vm.serializeAddress(k, "SeasonVault", address(d.vault));
        vm.serializeAddress(k, "GameManager", address(d.game));
        vm.serializeUint(k, "weekSeasonId", d.weekSeason);
        string memory json = vm.serializeUint(k, "monthSeasonId", d.monthSeason);

        string memory path = string.concat(vm.projectRoot(), "/deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(json, path);
        console.log("MockUSD           ", address(d.token));
        console.log("MockYieldStrategy ", address(d.strategy));
        console.log("SeasonVault       ", address(d.vault));
        console.log("GameManager       ", address(d.game));
        console.log("Deployment written to", path);
    }
}
