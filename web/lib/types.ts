export type Token = { t: string; c: string };

export type Hex = `0x${string}`;

export type ArcConfig = {
  chainId: number;
  network: string;
  usdc: Hex;
  factory: Hex;
  demoVault: Hex;
  demoSeller: Hex;
  relayer: Hex;
  price: string;
  explorer: string;
  facilitatorUrl: string;
  feeBps: number;
  minSettleAtomic: string;
};

export type Settlement = {
  tx: Hex;
  payer: Hex;
  vault: Hex;
  amount: string; // atomic, 6 decimals
  at: number; // ms
};

export type Stats = {
  network: string;
  factory: Hex;
  vault: Hex;
  seller: Hex;
  relayer: Hex;
  price: string;
  payments: number;
  volumeUsdc: string;
  feesUsdc?: string;
  payers: number;
  sellers?: number;
  recent: Settlement[];
};

export type VaultRow = { seller: Hex; vault: Hex; tx?: Hex; at?: number };

export type WalletSnapshot = {
  address: Hex;
  network: string;
  kind: "eoa" | "contract";
  balances: { usdc: string; eurc: string };
  txCount: number;
  recent25m: {
    blocksScanned: number;
    transfers: number;
    inUsdc: string;
    outUsdc: string;
    topCounterparties: { address: Hex; transfers: number }[];
    recent: { direction: "in" | "out"; counterparty: Hex; usdc: string; block: number; tx: Hex }[];
  };
  explorer: string;
};
