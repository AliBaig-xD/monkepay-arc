"use client";

import { createPublicClient, createWalletClient, custom, http, type EIP1193Provider, type WalletClient } from "viem";
import { arc } from "viem/chains";
import type { Hex } from "./types";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export const ARC_CHAIN_HEX = "0x13b2"; // 5042

export const arcPublicClient = createPublicClient({ chain: arc, transport: http("https://rpc.mainnet.arc.io") });

export class WalletError extends Error {
  constructor(
    public code: "no-wallet" | "rejected" | "wrong-chain" | "unknown",
    message: string,
  ) {
    super(message);
  }
}

export function isUserRejection(e: unknown) {
  const err = e as { code?: number; name?: string; message?: string; cause?: { code?: number } };
  return (
    err?.code === 4001 ||
    err?.cause?.code === 4001 ||
    err?.name === "UserRejectedRequestError" ||
    /user (rejected|denied)/i.test(err?.message ?? "")
  );
}

/** Ask the injected wallet for an account and make sure it's on Arc mainnet (adding the chain if needed). */
export async function connectArc(): Promise<{ wallet: WalletClient; address: Hex }> {
  const eth = typeof window !== "undefined" ? window.ethereum : undefined;
  if (!eth) throw new WalletError("no-wallet", "No browser wallet found. Install MetaMask, Rabby or another EVM wallet.");

  let accounts: Hex[];
  try {
    accounts = (await eth.request({ method: "eth_requestAccounts" })) as Hex[];
  } catch (e) {
    if (isUserRejection(e)) throw new WalletError("rejected", "Connection request was rejected.");
    throw e;
  }
  if (!accounts?.length) throw new WalletError("rejected", "No account was shared by the wallet.");

  const chainId = (await eth.request({ method: "eth_chainId" })) as string;
  if (chainId.toLowerCase() !== ARC_CHAIN_HEX) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_CHAIN_HEX }] });
    } catch (e) {
      const code = (e as { code?: number }).code;
      if (code === 4902 || code === -32603) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: ARC_CHAIN_HEX,
              chainName: "Arc",
              nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
              rpcUrls: ["https://rpc.mainnet.arc.io"],
              blockExplorerUrls: ["https://explorer.arc.io"],
            },
          ],
        });
      } else if (isUserRejection(e)) {
        throw new WalletError("wrong-chain", "Please switch your wallet to Arc mainnet (chain 5042).");
      } else {
        throw e;
      }
    }
  }

  const wallet = createWalletClient({ account: accounts[0], chain: arc, transport: custom(eth) });
  return { wallet, address: accounts[0] };
}

export const usdcAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

export const factoryAbi = [
  { type: "function", name: "createVault", stateMutability: "nonpayable", inputs: [{ name: "seller", type: "address" }], outputs: [{ type: "address" }] },
  { type: "function", name: "predictVault", stateMutability: "view", inputs: [{ name: "seller", type: "address" }], outputs: [{ type: "address" }] },
  { type: "function", name: "vaultOf", stateMutability: "view", inputs: [{ name: "seller", type: "address" }], outputs: [{ type: "address" }] },
  { type: "function", name: "isVault", stateMutability: "view", inputs: [{ name: "vault", type: "address" }], outputs: [{ type: "bool" }] },
] as const;
