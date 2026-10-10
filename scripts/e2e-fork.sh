#!/usr/bin/env bash
# End-to-end test on a local fork of Arc mainnet (Circle's arc-anvil): deploy factory + vault,
# start the server, pay for an API call with the stock x402 client, and check the 99/1 split.
# Requires arc-anvil on PATH: https://github.com/circlefin/arc-foundry/releases
set -euo pipefail
cd "$(dirname "$0")/.."
RPC=http://127.0.0.1:8545
USDC=0x3600000000000000000000000000000000000000
arc-anvil --network arc --fork-url https://rpc.mainnet.arc.io --port 8545 --silent & ANVIL=$!
trap 'kill $ANVIL ${SERVER:-} 2>/dev/null || true' EXIT
until cast block-number --rpc-url $RPC >/dev/null 2>&1; do sleep 1; done

key() { cast wallet new --json | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0))[0].private_key)'; }
DEPLOYER=$(key); AGENT=$(key)
SELLER=$(cast wallet address $(key)); PLATFORM=$(cast wallet address $(key))  # fresh, empty addresses
for k in $DEPLOYER $AGENT; do cast rpc anvil_setBalance $(cast wallet address $k) 0x8AC7230489E80000 --rpc-url $RPC >/dev/null; done

forge build -q
export DOTENV_CONFIG_PATH=/dev/null ARC_RPC_URL=$RPC DEPLOYER_PRIVATE_KEY=$DEPLOYER RELAYER_PRIVATE_KEY=$DEPLOYER AGENT_PRIVATE_KEY=$AGENT \
       SELLER_ADDRESS=$SELLER PLATFORM_ADDRESS=$PLATFORM PORT=4099 WEB_DIR=/nonexistent START_BLOCK=$(cast block-number --rpc-url $RPC)
DEPLOY_OUT=$(npx tsx scripts/deploy.ts); echo "$DEPLOY_OUT" | head -3
export FACTORY_ADDRESS=$(echo "$DEPLOY_OUT" | sed -n "s/^FACTORY_ADDRESS=//p")
npx tsx src/server.ts > /tmp/monkepay-e2e.log 2>&1 & SERVER=$!
for i in $(seq 90); do curl -sf localhost:4099/health >/dev/null && break; kill -0 $SERVER 2>/dev/null || { cat /tmp/monkepay-e2e.log; exit 1; }; sleep 1; done

npx tsx scripts/agent.ts 0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d http://localhost:4099 | head -3
bal() { cast call $USDC 'balanceOf(address)(uint256)' $1 --rpc-url $RPC | cut -d' ' -f1; }
S=$(bal $SELLER); P=$(bal $PLATFORM)
echo "seller=$S platform=$P"
[ "$S" = 9900 ] && [ "$P" = 100 ] && echo "E2E PASS" || { echo "E2E FAIL"; exit 1; }
