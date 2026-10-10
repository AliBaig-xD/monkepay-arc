"use client";

import { useStats } from "@/lib/api";

function Stat({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="flex flex-col gap-[4px] min-w-0">
      {loading ? (
        <span className="skeleton h-[26px] w-[72px]" />
      ) : (
        <span className="font-mono text-[22px] sm:text-[26px] font-semibold tracking-tight leading-none" style={{ color: "var(--text-primary)" }}>
          {value}
        </span>
      )}
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] faint">{label}</span>
    </div>
  );
}

/** Live counters from /api/stats (indexed from on-chain Settled events). */
export function StatsStrip() {
  const { data, error } = useStats(10_000);
  const loading = !data && !error;
  const v = (x: string | number | undefined, fallback = "–") => (x === undefined || x === null ? fallback : String(x));

  return (
    <div className="panel panel-pad">
      <div className="flex items-center justify-between mb-[16px] gap-[8px]">
        <span className="chip">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)", animation: "pulse-dot 2s ease infinite" }} />
          Live on Arc mainnet
        </span>
        <span className="font-mono text-[10px] faint hidden sm:inline">indexed from on-chain events · 10s</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[20px]">
        <Stat label="Payments settled" value={v(data?.payments)} loading={loading} />
        <Stat label="USDC volume" value={data ? `$${data.volumeUsdc}` : "–"} loading={loading} />
        <Stat label="Unique payers" value={v(data?.payers)} loading={loading} />
        <Stat label="Seller vaults" value={v(data?.sellers, "1")} loading={loading} />
      </div>
      {error && <p className="hint m-0 mt-[12px]">Live stats are unavailable right now; showing placeholders.</p>}
    </div>
  );
}
