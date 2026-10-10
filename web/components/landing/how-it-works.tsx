"use client";

import { useInView } from "@/utils/hooks/useInView";
import { SectionHead } from "../section-head";

const STEPS = [
  {
    num: "01",
    title: "Seller creates a vault",
    desc: "One transaction from the seller's wallet. The factory deploys a MonkeVault at a CREATE2 address with the seller, platform and fee fixed forever.",
    code: "factory.createVault(seller)",
  },
  {
    num: "02",
    title: "Agent signs, never sends",
    desc: "The API answers 402 with payTo = vault. The agent signs an EIP-3009 TransferWithAuthorization for exactly the price. No gas, no approval.",
    code: "402 → sign → retry",
  },
  {
    num: "03",
    title: "Vault splits atomically",
    desc: "The facilitator calls vault.settle(). USDC moves payer → vault → seller (99%) + platform (1%) in a single Arc transaction, then the API returns 200.",
    code: "+0.0099 seller · +0.0001 platform",
  },
];

function FlowDiagram() {
  // Plain SVG, themed through CSS variables so it reads in light and dark.
  return (
    <div className="panel panel-pad overflow-x-auto scrollbar-hide">
      <svg viewBox="0 0 860 210" className="w-full min-w-[620px] h-auto" role="img" aria-label="Payment flow: agent signs, facilitator settles into the MonkeVault, which splits to seller and platform">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
          </marker>
        </defs>
        {[
          { x: 20, y: 70, w: 150, t: "AI agent", s: "signs EIP-3009" },
          { x: 250, y: 70, w: 170, t: "Facilitator", s: "verify · settle()" },
          { x: 500, y: 70, w: 160, t: "MonkeVault", s: "on Arc · immutable", hl: true },
          { x: 730, y: 20, w: 115, t: "Seller", s: "99%" },
          { x: 730, y: 120, w: 115, t: "Platform", s: "1%" },
        ].map((b) => (
          <g key={b.t}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={70}
              rx={10}
              fill={b.hl ? "var(--accent-dim)" : "var(--bg-elevated)"}
              stroke={b.hl ? "var(--accent)" : "var(--border-strong)"}
            />
            <text x={b.x + b.w / 2} y={b.y + 31} textAnchor="middle" fontFamily="var(--font-sans)" fontSize="16" fontWeight="600" fill="var(--text-primary)">
              {b.t}
            </text>
            <text x={b.x + b.w / 2} y={b.y + 52} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="12" fill={b.hl ? "var(--accent)" : "var(--text-secondary)"}>
              {b.s}
            </text>
          </g>
        ))}
        <path d="M170 105 H246" stroke="var(--accent)" strokeWidth="2" markerEnd="url(#arr)" />
        <text x="208" y="96" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fill="var(--text-tertiary)">signature</text>
        <path d="M420 105 H496" stroke="var(--accent)" strokeWidth="2" markerEnd="url(#arr)" />
        <text x="458" y="96" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fill="var(--text-tertiary)">1 tx</text>
        <path d="M660 95 C 695 95, 695 55, 726 55" stroke="var(--accent)" strokeWidth="2" fill="none" markerEnd="url(#arr)" />
        <path d="M660 115 C 695 115, 695 155, 726 155" stroke="var(--accent)" strokeWidth="2" fill="none" markerEnd="url(#arr)" />
        <text x="430" y="196" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fill="var(--text-tertiary)">
          gas paid in USDC · final on inclusion · no server can redirect funds
        </text>
      </svg>
    </div>
  );
}

export function HowItWorks() {
  const { ref, inView } = useInView();
  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="wrap py-[56px]" id="how">
      <SectionHead
        eyebrow="How it works"
        title="Three steps. The split is enforced by the chain."
        lead="MonkePay on Base collected its fee afterwards with a sweep job. On Arc, the fee is part of the payment itself."
      />
      <FlowDiagram />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px] mt-[16px]">
        {STEPS.map((s, i) => (
          <div
            key={s.num}
            className="panel panel-pad"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(16px)",
              transition: `opacity .5s ease ${i * 100}ms, transform .5s ease ${i * 100}ms`,
            }}
          >
            <p className="font-mono text-[11px] m-0 mb-[8px]" style={{ color: "var(--accent)" }}>{s.num}</p>
            <h3 className="text-[15px] font-semibold m-0 mb-[8px]" style={{ color: "var(--text-primary)" }}>{s.title}</h3>
            <p className="text-[13px] leading-relaxed m-0 mb-[12px] muted">{s.desc}</p>
            <code className="font-mono text-[11px] px-[8px] py-[4px] rounded" style={{ color: "var(--accent)", background: "var(--accent-dim)" }}>
              {s.code}
            </code>
          </div>
        ))}
      </div>
    </section>
  );
}
