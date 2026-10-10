"use client";

import { useEffect, useState } from "react";
import { useConfig } from "@/lib/api";
import { CopyBlock } from "./copy-block";
import { Hash } from "./hash";

const TOC = [
  { id: "agents", label: "Quickstart: agents" },
  { id: "sellers", label: "Quickstart: sellers" },
  { id: "facilitator", label: "Facilitator API" },
  { id: "contracts", label: "Contracts" },
  { id: "why-arc", label: "Why Arc" },
  { id: "security", label: "Security model" },
];

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[22px] font-bold tracking-tight m-0 mt-[48px] mb-[12px] scroll-mt-[80px]" style={{ color: "var(--text-primary)" }}>
      <a href={`#${id}`} className="no-underline" style={{ color: "inherit" }}>{children}</a>
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] leading-relaxed m-0 mb-[12px] muted">{children}</p>;
}

function C({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[12.5px] px-[5px] py-[1px] rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}>{children}</code>;
}

export function DocsView() {
  const cfg = useConfig();
  const [origin, setOrigin] = useState("https://monkepay-arc-production.up.railway.app");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <div className="pt-[104px] wrap pb-[24px]">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-[32px]">
        <aside className="hidden lg:block">
          <nav className="sticky top-[88px] flex flex-col gap-[2px]">
            <p className="eyebrow m-0 mb-[10px]">Docs</p>
            {TOC.map((t) => (
              <a key={t.id} href={`#${t.id}`} className="nav-item">{t.label}</a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 max-w-[820px]">
          <p className="eyebrow m-0 mb-[10px]">Documentation</p>
          <h1 className="h-section m-0 mb-[12px]">MonkePay on Arc</h1>
          <P>
            MonkePay lets any HTTP API charge AI agents per request in USDC using the open <a className="link" href="https://x402.org" target="_blank" rel="noreferrer">x402</a> protocol.
            On Arc, each seller has a <b>MonkeVault</b>: the x402 pay-to address that splits every payment between the seller and the platform
            in the same transaction. Network: <C>eip155:5042</C> (Arc mainnet). Asset: USDC <C>{cfg.usdc}</C> (6 decimals, EIP-3009, domain <C>USDC</C> / <C>2</C>).
          </P>

          <H id="agents">Quickstart: agents</H>
          <P>Agents use the stock x402 client. Nothing about it is MonkePay-specific: if your agent can pay x402, it can pay any MonkePay API on Arc.</P>
          <CopyBlock code={`npm i @x402/fetch @x402/evm viem`} />
          <div className="h-[10px]" />
          <CopyBlock
            code={`import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch"
import { ExactEvmScheme } from "@x402/evm"
import { privateKeyToAccount } from "viem/accounts"

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY)   // holds a little USDC on Arc

const pay = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "eip155:5042", client: new ExactEvmScheme(account) }],
})

const res = await pay("${origin}/api/wallet/0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d")
console.log(await res.json())
console.log(decodePaymentResponseHeader(res.headers.get("PAYMENT-RESPONSE")))  // { success, transaction, ... }`}
          />
          <P>
            The client receives <C>402</C> with a <C>PAYMENT-REQUIRED</C> header, signs an EIP-3009 <C>TransferWithAuthorization</C> for exactly the price
            with <C>to = vault</C>, and retries with <C>PAYMENT-SIGNATURE</C>. The agent never sends a transaction or holds gas.
          </P>

          <H id="sellers">Quickstart: sellers</H>
          <P>
            1. Create your vault on the <a className="link" href="/sellers/">Sellers page</a> (one transaction), or call <C>createVault(seller)</C> on the factory yourself.
            The vault address is deterministic, so <C>predictVault(seller)</C> tells you your pay-to address before it exists.
          </P>
          <P>2. Gate a route with the standard x402 middleware, using the MonkePay facilitator and your vault as <C>payTo</C>:</P>
          <CopyBlock
            code={`import { paymentMiddleware, x402ResourceServer } from "@x402/hono"
import { ExactEvmScheme } from "@x402/evm/exact/server"
import { HTTPFacilitatorClient } from "@x402/core/server"

const facilitator = new HTTPFacilitatorClient({ url: "${origin}/facilitator" })
const server = new x402ResourceServer(facilitator).register("eip155:5042", new ExactEvmScheme())

app.use(paymentMiddleware({
  "GET /v1/data": { accepts: { scheme: "exact", network: "eip155:5042", payTo: YOUR_VAULT, price: "$0.01" } },
}, server))`}
          />
          <P>Every successful call settles on-chain and pays your payout address 99% and the platform 1%. There is no balance to withdraw and no sweep job.</P>

          <H id="facilitator">Facilitator API</H>
          <P>
            A public, vault-aware x402 facilitator for Arc. Verification is delegated to the reference <C>@x402/evm</C> exact scheme
            (signature, amount, time window, unused nonce, balance and an on-chain simulation). Settlement into a MonkeVault calls <C>vault.settle()</C>.
          </P>
          <div className="panel overflow-x-auto mb-[12px]">
            <table className="data-table min-w-[560px]">
              <thead>
                <tr><th>Method</th><th>Path</th><th>Body / response</th></tr>
              </thead>
              <tbody>
                <tr><td className="td-mono">GET</td><td className="td-mono">/facilitator/supported</td><td className="td-muted">kinds: exact on eip155:5042, plus signer addresses</td></tr>
                <tr><td className="td-mono">POST</td><td className="td-mono">/facilitator/verify</td><td className="td-muted">{"{ paymentPayload, paymentRequirements }"} → {"{ isValid, invalidReason?, payer }"}</td></tr>
                <tr><td className="td-mono">POST</td><td className="td-mono">/facilitator/settle</td><td className="td-muted">{"{ paymentPayload, paymentRequirements }"} → {"{ success, transaction, network, payer }"}</td></tr>
              </tbody>
            </table>
          </div>
          <P>
            Constraints: <C>payTo</C> must be a MonkeVault created by the factory; the amount must be at least {Number(cfg.minSettleAtomic) / 1e6} USDC
            ({cfg.minSettleAtomic} atomic units); requests are rate limited per IP. These keep the relayer, which pays gas, from being drained by
            dust settlements.
          </P>

          <H id="contracts">Contracts</H>
          <div className="flex flex-wrap gap-[8px] mb-[12px]">
            <span className="text-[13px] muted">Factory</span> <Hash value={cfg.factory} />
            <span className="text-[13px] muted ml-[8px]">Demo vault</span> <Hash value={cfg.demoVault} />
            <a className="badge badge-success no-underline" href={`https://repo.sourcify.dev/5042/${cfg.factory}`} target="_blank" rel="noreferrer"><span className="badge-dot" />Sourcify verified</a>
          </div>
          <CopyBlock
            label="MonkeVault (one per seller)"
            code={`settle(from, value, validAfter, validBefore, nonce, signature)
  // Pulls an EIP-3009 authorization (to = vault) and splits it in the same tx.
  // Emits Settled(payer, nonce, amount, sellerAmount, fee)
sweep()
  // Splits any USDC sent to the vault directly (e.g. settled by a plain facilitator).
seller() · platform() · feeBps() · usdc()   // immutable, fee capped at 10%`}
          />
          <div className="h-[10px]" />
          <CopyBlock
            label="MonkeVaultFactory"
            code={`createVault(seller) → vault        // idempotent; CREATE2 with salt = seller
predictVault(seller) → address      // pay-to address before deployment
vaultOf(seller) → address · isVault(address) → bool
event VaultCreated(seller, vault)`}
          />

          <H id="why-arc">Why Arc</H>
          <P><b>Gas is USDC.</b> The relayer holds the same asset it settles, with no second token to manage. A settlement is about 129k gas, roughly $0.003 at Arc&apos;s 20 gwei floor.</P>
          <P><b>Deterministic finality.</b> A payment is final when it is included, so the API can answer as soon as the receipt lands, with no confirmation wait or reorg risk.</P>
          <P><b>Native USDC with EIP-3009.</b> x402&apos;s exact scheme works unchanged, so standard x402 agents can pay Arc APIs without custom code.</P>

          <H id="security">Security model</H>
          <P>
            The relayer and server are untrusted for funds. A buyer&apos;s signature names the vault as recipient and fixes the amount, so a relayer can only
            submit it to that vault or not at all. The vault&apos;s seller, platform and fee are immutable. Replays fail at the USDC contract (nonce used).
            The contract test suite covers split conservation (fuzzed), replay, redirect-to-another-vault and value inflation.
          </P>
          <P>
            Source: <a className="link" href="https://github.com/AliBaig-xD/monkepay-arc" target="_blank" rel="noreferrer">github.com/AliBaig-xD/monkepay-arc</a>
          </P>
        </article>
      </div>
    </div>
  );
}
