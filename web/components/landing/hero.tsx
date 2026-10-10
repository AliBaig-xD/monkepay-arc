import Link from "next/link";
import { Terminal } from "@/components/terminal";
import { StatsStrip } from "./stats-strip";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-[104px] pb-[48px] sm:pt-[128px]">
      <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden="true" />
      <div
        className="absolute pointer-events-none"
        aria-hidden="true"
        style={{
          top: "10%",
          left: "20%",
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 7%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="wrap relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-[40px] items-start">
          <div className="flex flex-col gap-[20px]" style={{ animation: "fade-up .5s ease both" }}>
            <span className="chip">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              x402 · Arc mainnet · USDC
            </span>
            <h1
              className="text-[38px] sm:text-[52px] font-extrabold leading-[1.04] tracking-tight m-0"
              style={{ color: "var(--text-primary)" }}
            >
              Agents pay per request.
              <br />
              <span style={{ color: "var(--accent)" }}>Arc settles and splits it.</span>
            </h1>
            <p className="lead m-0 max-w-[520px]">
              Gate any API behind a USDC price. Agents pay with a standard x402 signature, and each payment lands in your own
              on-chain <b style={{ color: "var(--text-primary)" }}>MonkeVault</b>, which pays you 99% and the platform 1% in the
              same transaction. Gas is USDC, and payments are final on inclusion.
            </p>
            <div className="flex items-center gap-[10px] flex-wrap">
              <Link href="/#try" className="btn btn-primary btn-lg font-mono font-bold">
                Pay $0.01 with your wallet →
              </Link>
              <Link href="/sellers/" className="btn btn-secondary btn-lg font-mono">
                Create a vault
              </Link>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] m-0 faint">
              Open source · Contracts verified on Sourcify · Public x402 facilitator
            </p>
          </div>
          <div className="flex flex-col gap-[16px] min-w-0" style={{ animation: "fade-up .6s ease .1s both" }}>
            <Terminal />
            <StatsStrip />
          </div>
        </div>
      </div>
    </section>
  );
}
