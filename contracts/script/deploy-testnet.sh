#!/usr/bin/env bash
# Deploys jitu.fi to Monad testnet from a Foundry keystore account.
# Usage: bash contracts/script/deploy-testnet.sh [account]   (default account: my-wallet)
# Optional env: KEEPER_ADDRESS, FEE_RECIPIENT, DEMO_MODE, POINTS_K, SPONSOR_AMOUNT (see contracts/README.md).
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"

ACCOUNT="${1:-my-wallet}"
RPC="https://testnet-rpc.monad.xyz"
cd "$(dirname "$0")/.."

CHAIN_ID="$(cast chain-id --rpc-url "$RPC" | tr -d '[:space:]')"
if [ "$CHAIN_ID" != "10143" ]; then
  echo "Refusing: RPC chain id is $CHAIN_ID, expected 10143 (Monad testnet)." >&2
  exit 1
fi

echo "Unlocking keystore '$ACCOUNT' to read its address..."
# Strip whitespace: on Windows the prompt can leave a newline in the captured output.
SENDER="$(cast wallet address --account "$ACCOUNT" | tr -d '[:space:]')"
BALANCE="$(cast balance "$SENDER" --rpc-url "$RPC" --ether | tr -d '[:space:]')"
echo
echo "Deployer: $SENDER"
echo "Balance:  $BALANCE MON"
if [ "$(cast balance "$SENDER" --rpc-url "$RPC" | tr -d '[:space:]')" = "0" ]; then
  echo "No MON yet. Fund $SENDER at https://faucet.monad.xyz and run this again." >&2
  exit 1
fi

forge build

# Monad bills the gas limit, so keep the estimate buffer at 15% (forge's default is 30%).
# --slow waits for each receipt: accounts under the 10 MON reserve may send one tx per 3 blocks.
forge script script/Deploy.s.sol \
  --rpc-url "$RPC" \
  --account "$ACCOUNT" \
  --sender "$SENDER" \
  --broadcast \
  --slow \
  --gas-estimate-multiplier 115

echo
echo "Done. Addresses are in contracts/deployments/10143.json"
