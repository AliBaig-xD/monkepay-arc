"use client";

import { useEffect, useState } from "react";
import type { ArcConfig, Stats, VaultRow } from "./types";

// Same origin in production (the Hono server serves this static export).
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export const DEFAULT_CONFIG: ArcConfig = {
  chainId: 5042,
  network: "eip155:5042",
  usdc: "0x3600000000000000000000000000000000000000",
  factory: "0x33d3d2a4c442f8df1d37bf8de46b1df81d2012e7",
  demoVault: "0x5ff73431EBbd2Ad927f0Fa0264270A3368fe9AeC",
  demoSeller: "0xcd55Ea37F5d9d54dE56d921C29EFCc5796fCd3AF",
  relayer: "0x7B0990d5C796e80d82D8E494CD16FF3Def20aFd5",
  price: "$0.01",
  explorer: "https://explorer.arc.io",
  facilitatorUrl: "https://monkepay-arc-production.up.railway.app/facilitator",
  feeBps: 100,
  minSettleAtomic: "1000",
};

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Fetch JSON once (or on an interval). Failures leave data null so the UI can show skeletons. */
export function usePolling<T>(path: string, intervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const d = await getJson<T>(path);
        if (alive) {
          setData(d);
          setError(null);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
      if (alive && intervalMs > 0) timer = setTimeout(load, intervalMs);
    };
    load();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [path, intervalMs]);

  return { data, error };
}

export function useConfig(): ArcConfig {
  const { data } = usePolling<ArcConfig>("/api/config");
  return data ?? DEFAULT_CONFIG;
}

export const useStats = (intervalMs = 10_000) => usePolling<Stats>("/api/stats", intervalMs);
export const useVaults = (intervalMs = 15_000) => usePolling<VaultRow[]>("/api/vaults", intervalMs);

export const fmtUsd = (atomic: string | bigint, dp = 4) => {
  const n = Number(BigInt(atomic)) / 1e6;
  return `$${n.toFixed(dp)}`;
};

export const short = (v: string, a = 6, b = 4) => (v ? `${v.slice(0, a)}…${v.slice(-b)}` : "");

export function timeAgo(ms: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
