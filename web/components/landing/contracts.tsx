"use client";

import { useConfig } from "@/lib/api";
import { Hash } from "../hash";
import { SectionHead } from "../section-head";

export function Contracts() {
  const cfg = useConfig();
  const rows = [
    { name: "MonkeVaultFactory", addr: cfg.factory, note: "CREATE2 factory · one vault per seller", verified: true },
    { name: "Demo seller vault", addr: cfg.demoVault, note: "pay-to address for the live demo API", verified: true },
    { name: "USDC (ERC-20 interface)", addr: cfg.usdc, note: "Arc native USDC · EIP-3009", verified: false },
    { name: "Facilitator relayer", addr: cfg.relayer, note: "pays gas in USDC · can't redirect funds", verified: false },
  ];

  return (
    <section className="wrap py-[56px]" id="contracts">
      <SectionHead
        eyebrow="On-chain"
        title="Everything is verifiable"
        lead="The contracts are verified on Sourcify (exact match), and every payment is an Arc transaction you can open."
      />
      <div className="panel overflow-x-auto">
        <table className="data-table min-w-[620px]">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Address</th>
              <th>Notes</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="font-medium">{r.name}</td>
                <td>
                  <Hash value={r.addr} />
                </td>
                <td className="td-muted">{r.note}</td>
                <td>
                  {r.verified ? (
                    <a
                      className="badge badge-success no-underline"
                      href={`https://repo.sourcify.dev/5042/${r.addr}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="badge-dot" /> Verified
                    </a>
                  ) : (
                    <span className="badge badge-neutral">system</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
