import type { WalletSnapshot } from "@/lib/types";
import { Hash } from "../hash";

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-[4px] p-[14px] rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] faint">{label}</span>
      <span className="font-mono text-[18px] font-semibold" style={{ color: accent ? "var(--accent)" : "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

/** Renders the paid /api/wallet/:address response. */
export function WalletResult({ data }: { data: WalletSnapshot }) {
  const r = data.recent25m;
  return (
    <div className="panel panel-pad flex flex-col gap-[16px]">
      <div className="flex flex-wrap items-center justify-between gap-[8px]">
        <div className="flex items-center gap-[8px]">
          <Hash value={data.address} />
          <span className="badge badge-neutral">{data.kind}</span>
        </div>
        <span className="badge badge-accent">200 OK · paid</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[10px]">
        <Tile label="USDC" value={`$${data.balances.usdc}`} accent />
        <Tile label="EURC" value={`€${data.balances.eurc}`} />
        <Tile label="Tx count" value={String(data.txCount)} />
        <Tile label={`Transfers · ~25m`} value={String(r.transfers)} />
      </div>
      <div className="grid grid-cols-2 gap-[10px]">
        <Tile label="In (USDC)" value={`+${Number(r.inUsdc).toFixed(2)}`} />
        <Tile label="Out (USDC)" value={`−${Number(r.outUsdc).toFixed(2)}`} />
      </div>
      {r.recent.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[480px]">
            <thead>
              <tr>
                <th>Dir</th>
                <th>Counterparty</th>
                <th>USDC</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {r.recent.slice(0, 8).map((f) => (
                <tr key={`${f.tx}-${f.counterparty}-${f.direction}`}>
                  <td className={f.direction === "in" ? "td-positive" : "td-negative"}>{f.direction === "in" ? "IN" : "OUT"}</td>
                  <td><Hash value={f.counterparty} /></td>
                  <td className="td-mono">{f.usdc}</td>
                  <td><Hash value={f.tx} type="tx" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="hint m-0">No USDC transfers in the last {r.blocksScanned.toLocaleString()} blocks.</p>
      )}
      <details>
        <summary className="font-mono text-[11px] cursor-pointer muted">Raw JSON</summary>
        <pre className="code mt-[10px] max-h-[320px]">{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}
