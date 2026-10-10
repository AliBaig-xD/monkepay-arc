"use client";

import { useEffect, useState } from "react";
import { getAddress, isAddress, type WalletClient } from "viem";
import { arc } from "viem/chains";
import { timeAgo, useConfig, useVaults } from "@/lib/api";
import { arcPublicClient, connectArc, factoryAbi, isUserRejection, WalletError } from "@/lib/wallet";
import type { Hex } from "@/lib/types";
import { Hash } from "../hash";
import { SectionHead } from "../section-head";
import { CopyBlock } from "../copy-block";

const ZERO = "0x0000000000000000000000000000000000000000";

export function SellersView() {
  const cfg = useConfig();
  const { data: vaults, error: vaultsError } = useVaults();
  const [wallet, setWallet] = useState<WalletClient | null>(null);
  const [account, setAccount] = useState<Hex | null>(null);
  const [seller, setSeller] = useState("");
  const [predicted, setPredicted] = useState<Hex | null>(null);
  const [existing, setExisting] = useState<Hex | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: React.ReactNode } | null>(null);
  const [origin, setOrigin] = useState("https://monkepay-arc-production.up.railway.app");

  useEffect(() => setOrigin(window.location.origin), []);

  // Look up the seller's vault (deployed or predicted) whenever the address changes.
  useEffect(() => {
    setPredicted(null);
    setExisting(null);
    if (!isAddress(seller)) return;
    let alive = true;
    setChecking(true);
    (async () => {
      try {
        const s = getAddress(seller);
        const [p, v] = await Promise.all([
          arcPublicClient.readContract({ address: cfg.factory, abi: factoryAbi, functionName: "predictVault", args: [s] }),
          arcPublicClient.readContract({ address: cfg.factory, abi: factoryAbi, functionName: "vaultOf", args: [s] }),
        ]);
        if (!alive) return;
        setPredicted(p as Hex);
        setExisting((v as string) !== ZERO ? (v as Hex) : null);
      } catch {
        if (alive) setMsg({ kind: "err", text: "Couldn't reach Arc RPC to look up the vault. Try again in a moment." });
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [seller, cfg.factory]);

  async function connect() {
    setMsg(null);
    try {
      const { wallet, address } = await connectArc();
      setWallet(wallet);
      setAccount(address);
      if (!seller) setSeller(address);
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof WalletError ? e.message : (e as Error).message });
    }
  }

  async function create() {
    if (!wallet || !account || !isAddress(seller)) return;
    setBusy(true);
    setMsg(null);
    try {
      const hash = await wallet.writeContract({
        account,
        chain: arc,
        address: cfg.factory,
        abi: factoryAbi,
        functionName: "createVault",
        args: [getAddress(seller)],
      });
      setMsg({ kind: "ok", text: <>Transaction sent. Waiting for inclusion… <Hash value={hash} type="tx" /></> });
      const receipt = await arcPublicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The createVault transaction reverted.");
      const v = (await arcPublicClient.readContract({ address: cfg.factory, abi: factoryAbi, functionName: "vaultOf", args: [getAddress(seller)] })) as Hex;
      setExisting(v);
      setMsg({ kind: "ok", text: <>Vault created ✓ <Hash value={v} /> · tx <Hash value={hash} type="tx" /></> });
    } catch (e) {
      setMsg({
        kind: "err",
        text: isUserRejection(e) ? "You cancelled the transaction." : ((e as { shortMessage?: string }).shortMessage ?? (e as Error).message),
      });
    } finally {
      setBusy(false);
    }
  }

  const payTo = existing ?? predicted ?? "0xYOUR_MONKEVAULT";

  const snippet = `import { Hono } from "hono"
import { paymentMiddleware, x402ResourceServer } from "@x402/hono"
import { ExactEvmScheme } from "@x402/evm/exact/server"
import { HTTPFacilitatorClient } from "@x402/core/server"

const app = new Hono()

// MonkePay's public facilitator settles through your vault (99% to you, 1% platform, one tx).
const facilitator = new HTTPFacilitatorClient({ url: "${origin}/facilitator" })
const server = new x402ResourceServer(facilitator).register("eip155:5042", new ExactEvmScheme())

app.use(paymentMiddleware({
  "GET /v1/data": {
    accepts: { scheme: "exact", network: "eip155:5042", payTo: "${payTo}", price: "$0.01" },
    description: "My paid endpoint",
  },
}, server))

app.get("/v1/data", (c) => c.json({ hello: "paid world" }))`;

  return (
    <div className="pt-[104px]">
      <section className="wrap pb-[40px]">
        <SectionHead
          eyebrow="For sellers"
          title="Create your MonkeVault, then charge agents per request"
          lead="A MonkeVault is your x402 pay-to address on Arc. Payments into it are split on-chain: 99% to your payout address, 1% to the platform, in the same transaction. Seller, platform and fee are fixed at creation, so nobody (including MonkePay) can redirect your money."
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-[16px] items-start">
          <div className="panel panel-pad flex flex-col gap-[16px]">
            <div className="flex items-center justify-between gap-[8px]">
              <h3 className="text-[15px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>1 · Your vault</h3>
              {account ? <Hash value={account} /> : <button className="btn btn-secondary btn-sm font-mono" onClick={connect}>Connect wallet</button>}
            </div>

            <div className="flex flex-col gap-[6px]">
              <label className="label" htmlFor="seller">Payout address (receives 99%)</label>
              <input
                id="seller"
                className={`input input-mono ${seller && !isAddress(seller) ? "input-error" : ""}`}
                placeholder="0x…"
                value={seller}
                spellCheck={false}
                onChange={(e) => setSeller(e.target.value.trim())}
              />
              <span className="hint">Any address you control on Arc. It defaults to the connected wallet.</span>
            </div>

            <div className="flex flex-col gap-[8px] p-[14px] rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center justify-between gap-[8px] text-[13px]">
                <span className="muted">Vault address</span>
                {checking ? <span className="skeleton h-[22px] w-[120px]" /> : existing ? <Hash value={existing} /> : predicted ? <Hash value={predicted} /> : <span className="faint font-mono text-[12px]">enter an address</span>}
              </div>
              <div className="flex items-center justify-between gap-[8px] text-[13px]">
                <span className="muted">Status</span>
                {existing ? (
                  <span className="badge badge-success"><span className="badge-dot" />Deployed</span>
                ) : predicted ? (
                  <span className="badge badge-warning"><span className="badge-dot" />Not deployed yet</span>
                ) : (
                  <span className="badge badge-neutral">–</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-[8px] text-[13px]">
                <span className="muted">Split</span>
                <span className="font-mono text-[12px]">{100 - cfg.feeBps / 100}% you · {cfg.feeBps / 100}% platform</span>
              </div>
            </div>

            {existing ? (
              <p className="hint m-0">This payout address already has a vault. Use it as <span className="mono">payTo</span> below.</p>
            ) : (
              <button className="btn btn-primary btn-md font-mono font-bold" disabled={!predicted || busy} onClick={account ? create : connect}>
                {busy ? "Creating…" : account ? "Create vault on Arc" : "Connect wallet to create"}
              </button>
            )}
            <p className="hint m-0">
              Creating a vault is one transaction from your wallet (gas is paid in USDC, typically under $0.02). The address is
              deterministic (CREATE2), so you can use it as <span className="mono">payTo</span> before it is deployed;
              payments that arrive early are split with <span className="mono">sweep()</span>.
            </p>
            {msg && (
              <div className="text-[13px] flex flex-wrap items-center gap-[6px]" style={{ color: msg.kind === "ok" ? "var(--accent)" : "var(--danger)" }} role="status">
                {msg.text}
              </div>
            )}
          </div>

          <div className="panel panel-pad flex flex-col gap-[12px] min-w-0">
            <h3 className="text-[15px] font-semibold m-0" style={{ color: "var(--text-primary)" }}>2 · Gate your route</h3>
            <p className="text-[13px] m-0 muted">Stock x402 middleware. Point it at the MonkePay facilitator and set <span className="mono">payTo</span> to your vault.</p>
            <CopyBlock code={`npm i hono @x402/hono @x402/evm @x402/core`} />
            <CopyBlock code={snippet} />
            <p className="hint m-0">Express, Fastify and Next.js work the same way with <span className="mono">@x402/express</span>, <span className="mono">@x402/fastify</span> and <span className="mono">@x402/next</span>.</p>
          </div>
        </div>
      </section>

      <section className="wrap pb-[24px]">
        <SectionHead eyebrow="Registry" title="Vaults on Arc" lead="Every vault created through the factory, read from on-chain VaultCreated events." />
        <div className="panel overflow-x-auto">
          <table className="data-table min-w-[560px]">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Vault</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {vaults === null && !vaultsError &&
                [0, 1].map((i) => (
                  <tr key={i}>
                    <td colSpan={3}><span className="skeleton block h-[18px] w-full" /></td>
                  </tr>
                ))}
              {(vaults ?? (vaultsError ? [{ seller: cfg.demoSeller, vault: cfg.demoVault }] : [])).map((v) => (
                <tr key={v.vault}>
                  <td><Hash value={v.seller} /></td>
                  <td><Hash value={v.vault} /></td>
                  <td className="td-muted">{v.at ? timeAgo(v.at) : v.tx ? <Hash value={v.tx} type="tx" /> : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
