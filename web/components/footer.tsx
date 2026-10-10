import Link from "next/link";
import { Logo } from "./logo";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "Try it live", href: "/#try" },
      { label: "Create a vault", href: "/sellers/" },
      { label: "Activity", href: "/activity/" },
      { label: "Docs", href: "/docs/" },
    ],
  },
  {
    title: "Source",
    links: [
      { label: "GitHub: monkepay-arc", href: "https://github.com/AliBaig-xD/monkepay-arc" },
      { label: "MonkePay SDK", href: "https://github.com/AliBaig-xD/monkepay-sdk" },
      { label: "Verified on Sourcify", href: "https://repo.sourcify.dev/5042/0x33d3d2a4c442f8df1d37bf8de46b1df81d2012e7" },
    ],
  },
  {
    title: "Infrastructure",
    links: [
      { label: "Arc", href: "https://arc.io" },
      { label: "x402", href: "https://x402.org" },
      { label: "USDC", href: "https://www.circle.com/usdc" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="pt-[56px] pb-[32px] mt-[40px]" style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <div className="wrap">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[32px] mb-[40px]">
          <div>
            <div className="flex items-center gap-[8px] mb-[12px]">
              <Logo size={20} />
              <span className="font-mono font-bold text-[13px] tracking-tight" style={{ color: "var(--text-primary)" }}>
                MonkePay on Arc
              </span>
            </div>
            <p className="text-[13px] leading-relaxed m-0 max-w-[260px] muted">
              Pay-per-request APIs for AI agents, settled in USDC on Arc with the fee split enforced on-chain.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h5 className="font-mono text-[10px] font-bold uppercase tracking-widest m-0 mb-[14px]" style={{ color: "var(--text-primary)" }}>
                {col.title}
              </h5>
              <ul className="list-none p-0 m-0 flex flex-col gap-[10px]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("http") ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className="text-[13px] no-underline muted hover:text-[var(--accent)]">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-[13px] no-underline muted hover:text-[var(--accent)]">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row justify-between gap-[8px] pt-[20px]" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <p className="font-mono text-[11px] m-0 faint">Arc mainnet · chain 5042 · eip155:5042</p>
          <p className="font-mono text-[11px] m-0 faint">
            Built by{" "}
            <a href="https://iamalibaig.com" target="_blank" rel="noreferrer" className="link">
              Ali Baig
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
