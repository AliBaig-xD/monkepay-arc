"use client";

import { useEffect, useRef, useState } from "react";
import { isAddress, type WalletClient } from "viem";
import { arc } from "viem/chains";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { decodePaymentResponseHeader, wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { API_BASE, useConfig } from "@/lib/api";
import { arcPublicClient, connectArc, isUserRejection, usdcAbi, WalletError } from "@/lib/wallet";
import type { Hex, WalletSnapshot } from "@/lib/types";
import { Hash } from "../hash";
import { SectionHead } from "../section-head";
import { WalletResult } from "./wallet-result";

type StepKey = "connect" | "request" | "challenge" | "sign" | "settle" | "done";
type StepState = "idle" | "active" | "done" | "error";

const STEPS: { key: StepKey; label: string; hint: string }[] = [
  { key: "connect", label: "Connect wallet on Arc", hint: "switches or adds chain 5042" },
  { key: "request", label: "Request the paid API", hint: "GET /api/wallet/:address" },
  { key: "challenge", label: "402 Payment Required", hint: "price, asset and payTo = vault" },
  { key: "sign", label: "Sign the authorization", hint: "EIP-3009 · off-chain · no gas" },
  { key: "settle", label: "Vault settles and splits", hint: "one Arc tx · 99 / 1" },
  { key: "done", label: "200 OK, data returned", hint: "with the settlement tx" },
];

const INITIAL: Record<StepKey, StepState> = { connect: "idle", request: "idle", challenge: "idle", sign: "idle", settle: "idle", done: "idle" };

type Problem = { title: string; body: React.ReactNode };

function decodeB64Json(h: string | null): Record<string, unknown> | null {
  if (!h) return null;
  try {
    return JSON.parse(atob(h)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function TryIt() {
  const cfg = useConfig();
  const [target, setTarget] = useState<string>("0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d");
  const [steps, setSteps] = useState<Record<StepKey, StepState>>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<Hex | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [result, setResult] = useState<WalletSnapshot | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const walletRef = useRef<WalletClient | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const mark = (k: StepKey, s: StepState) => setSteps((prev) => ({ ...prev, [k]: s }));
  const failActive = () => setSteps((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v === "active" ? "error" : v])) as Record<StepKey, StepState>);

  async function readBalance(addr: Hex) {
    try {
      const b = (await arcPublicClient.readContract({ address: cfg.usdc, abi: usdcAbi, functionName: "balanceOf", args: [addr] })) as bigint;
      setBalance(b);
      return b;
    } catch {
      return null;
    }
  }

  async function connect() {
    mark("connect", "active");
    const { wallet, address } = await connectArc();
    walletRef.current = wallet;
    setAccount(address);
    mark("connect", "done");
    return { wallet, address };
  }

  async function pay() {
    if (!isAddress(target)) {
      setProblem({ title: "That isn't an address", body: "Enter a 0x… address on Arc to look up." });
      return;
    }
    setBusy(true);
    setProblem(null);
    setResult(null);
    setTx(null);
    setElapsed(null);
    setSteps(INITIAL);
    const started = performance.now();

    try {
      const { wallet, address } = walletRef.current && account ? { wallet: walletRef.current, address: account } : await connect();
      mark("connect", "done");

      const bal = await readBalance(address);
      if (bal !== null && bal < BigInt(10_000)) {
        mark("request", "error");
        setProblem({
          title: "Not enough USDC on Arc",
          body: (
            <>
              This call costs $0.01 and <span className="mono">{address.slice(0, 8)}…</span> holds less than that on Arc. Bridge USDC with{" "}
              <a className="link" href="https://developers.circle.com/cctp" target="_blank" rel="noreferrer">Circle CCTP</a> (Arc is CCTP domain 26) or
              withdraw from an exchange that supports Arc. A few cents are enough; gas is paid in USDC too.
            </>
          ),
        });
        return;
      }

      // x402 client signer backed by the browser wallet. Signing is the only wallet prompt: the agent never sends a tx.
      const signer = toClientEvmSigner(
        {
          address,
          signTypedData: async (msg) => {
            mark("challenge", "done");
            mark("sign", "active");
            // The x402 client hands us a fully-formed EIP-712 payload; pass it straight to the wallet.
            const sig = await (wallet.signTypedData as (args: unknown) => Promise<Hex>)({
              account: address,
              domain: msg.domain,
              types: msg.types,
              primaryType: msg.primaryType,
              message: msg.message,
            });
            mark("sign", "done");
            mark("settle", "active");
            return sig;
          },
        },
        arcPublicClient as never,
      );

      // Wrap fetch so the UI can show the 402 → retry handshake as it happens.
      let calls = 0;
      const observedFetch: typeof fetch = async (input, init) => {
        calls += 1;
        if (calls === 1) mark("request", "active");
        const res = await fetch(input, init);
        if (calls === 1) {
          mark("request", "done");
          if (res.status === 402) mark("challenge", "active");
        }
        return res;
      };

      const payFetch = wrapFetchWithPaymentFromConfig(observedFetch, {
        schemes: [{ network: "eip155:5042", client: new ExactEvmScheme(signer) }],
      });

      const res = await payFetch(`${API_BASE}/api/wallet/${target}`, { headers: { accept: "application/json" } });
      const paymentResponse = res.headers.get("PAYMENT-RESPONSE") ?? res.headers.get("X-PAYMENT-RESPONSE");

      if (!res.ok) {
        const required = decodeB64Json(res.headers.get("PAYMENT-REQUIRED"));
        failActive();
        setProblem({
          title: `Server answered ${res.status}`,
          body: required?.error ? <>Payment was not accepted: <span className="mono">{String(required.error)}</span></> : "The paid request did not complete. Nothing was charged unless a settlement tx is shown.",
        });
        return;
      }

      const data = (await res.json()) as WalletSnapshot;
      if (paymentResponse) {
        try {
          const decoded = decodePaymentResponseHeader(paymentResponse) as { transaction?: string };
          if (decoded?.transaction) setTx(decoded.transaction);
        } catch {}
      }
      mark("settle", "done");
      mark("done", "done");
      setResult(data);
      setElapsed(Math.round(performance.now() - started));
      readBalance(address);
    } catch (e) {
      failActive();
      if (e instanceof WalletError) {
        setProblem({
          title: e.code === "no-wallet" ? "No wallet found" : e.code === "wrong-chain" ? "Wrong network" : "Wallet request cancelled",
          body:
            e.code === "no-wallet" ? (
              <>
                Install an EVM wallet such as MetaMask or Rabby, or pay from code with the stock x402 client (see the{" "}
                <a className="link" href="/docs/#agents">agent quickstart</a>).
              </>
            ) : (
              e.message
            ),
        });
      } else if (isUserRejection(e)) {
        setProblem({ title: "Signature cancelled", body: "You declined the signature, so nothing was paid." });
      } else {
        const msg = (e as Error)?.message ?? String(e);
        setProblem({ title: "Something went wrong", body: <span className="mono text-[12px] break-all">{msg.slice(0, 300)}</span> });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="wrap py-[56px] scroll-mt-[72px]" id="try">
      <SectionHead
        eyebrow="Try it live"
        title={<>Pay {cfg.price} from your wallet. Watch it settle on Arc.</>}
        lead="This is a real paid API on Arc mainnet. Your wallet signs one EIP-3009 authorization (no gas, no approval), the facilitator settles it through the demo MonkeVault, and you get the data back with the settlement transaction."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-[16px] items-start">
        <div className="panel panel-pad flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <label className="label" htmlFor="target">Arc address to look up</label>
            <input
              id="target"
              className={`input input-mono ${target && !isAddress(target) ? "input-error" : ""}`}
              value={target}
              spellCheck={false}
              onChange={(e) => setTarget(e.target.value.trim())}
              placeholder="0x…"
            />
            <span className="hint">Returns USDC/EURC balances, activity and the last ~25 minutes of USDC flows.</span>
          </div>

          <button type="button" className="btn btn-primary btn-lg font-mono font-bold w-full" onClick={pay} disabled={busy}>
            {busy ? "Working…" : `Pay ${cfg.price} & fetch →`}
          </button>

          {account && (
            <div className="flex items-center justify-between gap-[8px] text-[12px]">
              <span className="muted">Connected</span>
              <span className="flex items-center gap-[8px]">
                <Hash value={account} />
                {balance !== null && <span className="font-mono faint">${(Number(balance) / 1e6).toFixed(4)}</span>}
              </span>
            </div>
          )}

          <ol className="list-none p-0 m-0 flex flex-col gap-[10px]">
            {STEPS.map((s, i) => {
              const st = steps[s.key];
              return (
                <li key={s.key} className="flex items-start gap-[10px]">
                  <span className={`step-dot ${st === "idle" ? "" : st}`}>{st === "done" ? "✓" : st === "error" ? "!" : i + 1}</span>
                  <span className="flex flex-col">
                    <span className="text-[13px]" style={{ color: st === "idle" ? "var(--text-secondary)" : "var(--text-primary)" }}>
                      {s.label}
                      {st === "active" && <span className="ml-[6px]" style={{ color: "var(--accent)", animation: "pulse-dot 1s ease infinite" }}>●</span>}
                    </span>
                    <span className="hint">{s.hint}</span>
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="hint m-0">
            Needs a little USDC on Arc ({cfg.price} per call). Payments go to the demo vault{" "}
            <a className="link" href={`${cfg.explorer}/address/${cfg.demoVault}`} target="_blank" rel="noreferrer">{cfg.demoVault.slice(0, 8)}…</a>, which pays the
            seller 99% and the platform 1% on-chain.
          </p>
        </div>

        <div className="flex flex-col gap-[16px] min-w-0">
          {problem && (
            <div className="panel panel-pad" style={{ borderColor: "color-mix(in srgb, var(--danger) 40%, transparent)" }} role="alert">
              <p className="text-[14px] font-semibold m-0 mb-[6px]" style={{ color: "var(--danger)" }}>{problem.title}</p>
              <div className="text-[13px] leading-relaxed muted">{problem.body}</div>
            </div>
          )}

          {tx && (
            <div className="panel panel-pad flex flex-col sm:flex-row sm:items-center justify-between gap-[10px]" style={{ borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" }}>
              <div>
                <p className="text-[14px] font-semibold m-0" style={{ color: "var(--accent)" }}>Paid {cfg.price} · settled on Arc ✓</p>
                <p className="hint m-0 mt-[2px]">
                  Split in one transaction: $0.0099 to the seller, $0.0001 to the platform{elapsed ? ` · ${(elapsed / 1000).toFixed(1)}s end to end` : ""}
                </p>
              </div>
              <a className="btn btn-secondary btn-sm font-mono" href={`${cfg.explorer}/tx/${tx}`} target="_blank" rel="noreferrer">
                View tx {tx.slice(0, 10)}… ↗
              </a>
            </div>
          )}

          {result ? (
            <WalletResult data={result} />
          ) : (
            <div className="terminal p-[18px] font-mono text-[12px] leading-[1.8] min-h-[260px]">
              <p className="m-0" style={{ color: "#6e7681" }}>{"// response appears here"}</p>
              <p className="m-0" style={{ color: "#6e7681" }}>{"// try it without a wallet:"}</p>
              <p className="m-0 break-all">
                <span style={{ color: "#00d4aa" }}>curl</span> -i {origin}/api/wallet/{target.slice(0, 10)}…
              </p>
              <p className="m-0" style={{ color: "#f87171" }}>HTTP/1.1 402 Payment Required</p>
              <p className="m-0" style={{ color: "#6e7681" }}>{`PAYMENT-REQUIRED: { network: "eip155:5042", asset: USDC, payTo: ${cfg.demoVault.slice(0, 10)}… }`}</p>
              <p className="m-0 mt-[10px]" style={{ color: "#6e7681" }}>{`// chain: ${arc.name} (${arc.id}) · gas token: USDC`}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
