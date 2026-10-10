import type { Token } from "../types";

export type SimStep = {
  side: "server" | "agent";
  text: string;
  color: string;
  bold?: boolean;
  delay: number;
};

const K = "#00d4aa"; // keyword
const T = "#c9d1d9"; // text
const S = "#4ade80"; // string
const V = "#fbbf24"; // value
const C = "#6e7681"; // comment

export const SERVER_CODE: Token[][] = [
  [{ t: "import", c: K }, { t: " { paymentMiddleware, x402ResourceServer } ", c: T }, { t: "from", c: K }, { t: ' "@x402/hono"', c: S }],
  [{ t: "import", c: K }, { t: " { HTTPFacilitatorClient } ", c: T }, { t: "from", c: K }, { t: ' "@x402/core/server"', c: S }],
  [],
  [{ t: "const", c: K }, { t: " facilitator = ", c: T }, { t: "new", c: K }, { t: " HTTPFacilitatorClient({ url: ", c: T }, { t: '".../facilitator"', c: S }, { t: " })", c: T }],
  [],
  [{ t: "app.", c: T }, { t: "use", c: K }, { t: "(paymentMiddleware({", c: T }],
  [{ t: '  "GET /v1/data"', c: S }, { t: ": { accepts: {", c: T }],
  [{ t: "    network: ", c: T }, { t: '"eip155:5042"', c: S }, { t: ",  ", c: T }, { t: "// Arc", c: C }],
  [{ t: "    payTo: ", c: T }, { t: "YOUR_MONKEVAULT", c: V }, { t: ", price: ", c: T }, { t: '"$0.01"', c: S }],
  [{ t: "}}}, server))", c: T }],
];

export const AGENT_CODE: Token[][] = [
  [{ t: "import", c: K }, { t: " { wrapFetchWithPaymentFromConfig } ", c: T }, { t: "from", c: K }, { t: ' "@x402/fetch"', c: S }],
  [{ t: "import", c: K }, { t: " { ExactEvmScheme } ", c: T }, { t: "from", c: K }, { t: ' "@x402/evm"', c: S }],
  [],
  [{ t: "const", c: K }, { t: " pay = ", c: T }, { t: "wrapFetchWithPaymentFromConfig", c: K }, { t: "(fetch, {", c: T }],
  [{ t: "  schemes: [{ network: ", c: T }, { t: '"eip155:5042"', c: S }, { t: ", client: ", c: T }, { t: "new", c: K }, { t: " ExactEvmScheme(account) }]", c: T }],
  [{ t: "})", c: T }],
  [],
  [{ t: "// 402 → sign → retry → 200, automatically", c: C }],
  [{ t: "const", c: K }, { t: " res = ", c: T }, { t: "await", c: K }, { t: " pay(", c: T }, { t: '"https://api.example.com/v1/data"', c: S }, { t: ")", c: T }],
];

export const SIM_STEPS: SimStep[] = [
  { side: "agent", text: "→ GET /api/wallet/0x28b5…9d5f", color: T, delay: 0 },
  { side: "server", text: "← 402 Payment Required", color: "#f87171", bold: true, delay: 600 },
  { side: "server", text: '   { network: "eip155:5042", price: "$0.01", payTo: vault }', color: C, delay: 900 },
  { side: "agent", text: "→ Sign EIP-3009 transferWithAuthorization (to = vault)", color: K, delay: 1500 },
  { side: "agent", text: "→ Retry with PAYMENT-SIGNATURE header", color: T, delay: 2100 },
  { side: "server", text: "   vault.settle(): 0.0099 → seller · 0.0001 → platform", color: C, delay: 2800 },
  { side: "server", text: "← 200 OK ✓  final on inclusion", color: S, bold: true, delay: 3400 },
];

export const HANDSHAKE_LINES = [
  { text: "// x402 on Arc mainnet · eip155:5042", color: C, small: true },
  { text: "→  GET /api/wallet/0x28b5…9d5f", color: T },
  { text: "←  402 Payment Required  (USDC · $0.01 · payTo MonkeVault)", color: "#f87171", bold: true },
  { text: "→  sign TransferWithAuthorization  { to: vault, value: 10000 }", color: K },
  { text: "   no gas, no approval: it's an off-chain signature", color: C, small: true },
  { text: "→  GET /api/wallet/0x28b5…9d5f  { PAYMENT-SIGNATURE: … }", color: T },
  { text: "   facilitator → vault.settle()  ·  split 99 / 1 in one tx", color: C, small: true },
  { text: "←  200 OK ✓  PAYMENT-RESPONSE: { tx: 0x9f0a…60a0 }", color: S, bold: true },
];

export const LANDING_FEATURES = [
  {
    icon: "◈",
    title: "x402 native",
    desc: "Standard HTTP 402. Any x402 client pays your API unchanged: no SDK, no API keys, no accounts for the buyer.",
  },
  {
    icon: "⬡",
    title: "Split on-chain",
    desc: "Each seller gets a MonkeVault. Payments land there and are split seller / platform in the same transaction. Nothing to sweep, nothing to trust.",
  },
  {
    icon: "$",
    title: "Gas is USDC",
    desc: "On Arc the relayer pays gas in the asset it settles. One balance to watch, about $0.003 per settlement, and no ETH float.",
  },
  {
    icon: "✓",
    title: "Final on inclusion",
    desc: "Arc finalises a payment the moment it is included, so the API can respond as soon as the receipt lands. No reorg window.",
  },
];
