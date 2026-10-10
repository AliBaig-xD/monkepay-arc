"use client";

import { useEffect, useState } from "react";
import { fmtUsd, timeAgo, useStats } from "@/lib/api";
import { Hash } from "./hash";
import { SectionHead } from "./section-head";
import { StatsStrip } from "./landing/stats-strip";

export function ActivityView() {
  const { data, error } = useStats(5_000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const rows = data?.recent ?? [];

  return (
    <div className="pt-[104px]">
      <section className="wrap pb-[24px]">
        <SectionHead
          eyebrow="Activity"
          title="Every payment is an Arc transaction"
          lead="Settlements are read straight from the vaults' on-chain Settled events and refresh every few seconds. Each row links to the transaction that moved the USDC and split it."
        />
        <StatsStrip />
      </section>

      <section className="wrap pb-[24px]">
        <div className="panel overflow-x-auto">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>When</th>
                <th>Payer</th>
                <th>Vault</th>
                <th>Amount</th>
                <th>Seller / platform</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {!data && !error &&
                [0, 1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={6}><span className="skeleton block h-[18px] w-full" /></td>
                  </tr>
                ))}
              {rows.map((r) => {
                const amt = BigInt(r.amount);
                const fee = amt / BigInt(100);
                return (
                  <tr key={r.tx}>
                    <td className="td-muted td-mono">{timeAgo(r.at, now)}</td>
                    <td><Hash value={r.payer} /></td>
                    <td><Hash value={r.vault} /></td>
                    <td className="td-positive">{fmtUsd(amt)}</td>
                    <td className="td-neutral">{fmtUsd(amt - fee, 4)} / {fmtUsd(fee, 4)}</td>
                    <td><Hash value={r.tx} type="tx" /></td>
                  </tr>
                );
              })}
              {data && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="td-muted text-center">No payments yet. Be the first on the home page.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error && <p className="hint mt-[10px]">Couldn&apos;t load activity ({error}). Retrying…</p>}
      </section>
    </div>
  );
}
