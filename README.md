# MonkePay on Arc

Pay-per-request APIs for AI agents, settled in USDC on **Arc mainnet** over **x402**, with the seller/platform fee split enforced on-chain.

[MonkePay](https://github.com/AliBaig-xD/monkepay-sdk) lets any API charge agents per call in USDC with one line of middleware. It shipped on Base, where the platform fee is collected afterwards by a sweep job. This project brings it to Arc and moves the split on-chain:

- **`MonkeVault`**: a per-seller pay-to address. Buyers sign a standard EIP-3009 `TransferWithAuthorization` to the vault. Anyone can submit it, and the vault pulls the funds and splits them between seller and platform **in the same transaction**. Seller, platform and fee (hard-capped at 10%) are immutable, so no server or relayer can redirect funds.
- **`MonkeVaultFactory`**: CREATE2 vault per seller, so a seller's pay-to address is known before the vault exists.
- **Vault-aware x402 facilitator**: verification is delegated to the reference `@x402/evm` exact scheme. Settlement for vaults goes through `vault.settle()`, and other addresses fall back to plain `transferWithAuthorization`. It is exposed as a public facilitator (`/facilitator/supported|verify|settle`).
- **Demo paid API**: `GET /api/wallet/:address` returns an Arc wallet snapshot (USDC/EURC balances, activity, last-hour USDC flows) for **$0.01 per call**.
- **Agent client**: uses the stock `@x402/fetch` client with **no MonkePay-specific code**. If an agent can speak x402, it can pay.

## Why Arc

- **Gas is USDC.** The facilitator's relayer holds one asset, the same one it settles, with no ETH float to manage. A settlement costs about 129k gas, roughly $0.0026 at Arc's 20 gwei floor.
- **Deterministic finality.** A payment is final on inclusion, so the API can serve the response as soon as the receipt lands, with no reorg window.
- **Native USDC with EIP-3009** at `0x3600…0000` (domain `USDC` / `2`), so x402's exact scheme works unchanged on `eip155:5042`.

## Deployments (Arc mainnet, chain 5042)

| Contract | Address |
| --- | --- |
| MonkeVaultFactory | [`0x33d3d2a4c442f8df1d37bf8de46b1df81d2012e7`](https://explorer.arc.io/address/0x33d3d2a4c442f8df1d37bf8de46b1df81d2012e7) |
| Demo seller vault | [`0x5ff73431EBbd2Ad927f0Fa0264270A3368fe9AeC`](https://explorer.arc.io/address/0x5ff73431EBbd2Ad927f0Fa0264270A3368fe9AeC) |

First mainnet settlement (agent pays $0.01, vault splits 99/1 in one tx): [`0x9f0a0257…a0`](https://explorer.arc.io/tx/0x9f0a0257023e54e948d87a7ddb60c37ecbe1ba82112e4a9e07b01b8cca2960a0)

Live demo: _URL after deploy_

## How a payment flows

```
agent ──GET /api/wallet/0x…──────────────▶ API (x402 middleware)
      ◀─402 PAYMENT-REQUIRED (payTo = vault, $0.01, eip155:5042)
agent signs EIP-3009 auth (to = vault) ──▶ API ─▶ facilitator.verify (sig, amount, window, balance, simulation)
                                                  facilitator.settle ─▶ vault.settle(auth)  ── one Arc tx:
                                                                            USDC: payer → vault → seller (99%) + platform (1%)
      ◀─200 + PAYMENT-RESPONSE (tx hash)
```

## Run it

```bash
npm install
npm run contracts:build && npm run contracts:test  # contract tests incl. fuzzed split conservation, replay & redirect attempts
cp .env.example .env               # fill keys; relayer needs a little USDC on Arc for gas
npm run deploy                     # deploys factory + seller vault, prints FACTORY_ADDRESS
npm start                          # dashboard on :4021
npm run agent -- 0xSomeArcAddress  # pays $0.01 and prints the snapshot + settlement tx
```

Local end-to-end testing uses Circle's Arc Foundry fork (`arc-anvil --network arc --fork-url https://rpc.mainnet.arc.io`). Stock anvil cannot reproduce Arc's native-USDC transfers.

## Notes

- The fallback path settles plain `transferWithAuthorization` payments into a vault. `sweep()` then splits anything that arrived that way, so vaults stay compatible with any x402 facilitator, including Circle's.
- At $0.01 per call, the 1% fee ($0.0001) is below the gas per settlement. Batching (x402 `batch-settlement`) is the next step for sub-cent pricing.

ISC licensed. Built by [Ali Baig](https://iamalibaig.com).
