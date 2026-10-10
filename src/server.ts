import 'dotenv/config'
import { Hono, type Context } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { cors } from 'hono/cors'
import { bodyLimit } from 'hono/body-limit'
import { secureHeaders } from 'hono/secure-headers'
import { paymentMiddleware, x402ResourceServer } from '@x402/hono'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { getAddress, isAddress, type Hex } from 'viem'
import { existsSync, readFileSync } from 'node:fs'
import { createFacilitator, type SettlementRecord } from './facilitator.js'
import { publicClient, factoryAbi, vaultAbi, erc20Abi, NETWORK, USDC, EURC, EXPLORER, usd } from './arc.js'
import { dashboardHtml } from './dashboard.js'
import { rateLimit } from './rate-limit.js'

const env = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`missing env ${k}`); return v }
const FACTORY = getAddress(env('FACTORY_ADDRESS')) as Hex
const SELLER = getAddress(env('SELLER_ADDRESS')) as Hex
const PRICE = process.env.PRICE_USD || '$0.01'
const PORT = Number(process.env.PORT || 4021)
// Smallest payment the public facilitator will settle: below this, gas (~$0.003) would exceed the payment.
const MIN_SETTLE_ATOMIC = BigInt(process.env.MIN_SETTLE_ATOMIC || '1000') // $0.001
// Refuse to broadcast when the relayer can no longer cover gas, rather than failing mid-flight.
const MIN_RELAYER_ATOMIC = BigInt(process.env.MIN_RELAYER_ATOMIC || '20000') // $0.02

// --- on-chain index: vaults (VaultCreated on the factory) and their Settled events -----------------
type VaultRecord = { seller: string; vault: string; tx: string; at: number }
const vaults = new Map<string, VaultRecord>() // vault (lowercase) -> record
const settlements: SettlementRecord[] = []
const seenTx = new Set<string>()
const record = (r: SettlementRecord) => {
  if (seenTx.has(r.tx)) return
  seenTx.add(r.tx)
  settlements.push(r)
  settlements.sort((a, b) => b.at - a.at)
}

const feeBps = Number(await publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'feeBps' }))
const vault = (await publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'vaultOf', args: [SELLER] })) as Hex
if (/^0x0+$/.test(vault)) throw new Error(`no vault for seller ${SELLER}; run scripts/deploy.ts first`)

const isKnownVault = async (addr: string) => {
  if (vaults.has(addr.toLowerCase())) return true
  return (await publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'isVault', args: [getAddress(addr)] })) as boolean
}

const eventAbi = (abi: readonly any[], name: string) => abi.find((x) => x.type === 'event' && x.name === name)
const blockTime = new Map<bigint, number>()
const timeOf = async (n: bigint) => {
  if (!blockTime.has(n)) blockTime.set(n, Number((await publicClient.getBlock({ blockNumber: n })).timestamp) * 1000)
  return blockTime.get(n)!
}

// Arc caps eth_getLogs at 1,000 blocks, so the indexer walks forward in windows and then follows the head.
let cursor = BigInt(process.env.START_BLOCK || '0')
let indexedHead = 0n
async function indexChain() {
  try {
    const head = await publicClient.getBlockNumber()
    while (cursor <= head) {
      const toBlock = cursor + 999n > head ? head : cursor + 999n
      const created = await publicClient.getLogs({ address: FACTORY, event: eventAbi(factoryAbi, 'VaultCreated'), fromBlock: cursor, toBlock })
      for (const l of created as any[]) {
        vaults.set(l.args.vault.toLowerCase(), { seller: l.args.seller, vault: l.args.vault, tx: l.transactionHash, at: await timeOf(l.blockNumber) })
      }
      const addrs = [...vaults.values()].map((v) => v.vault as Hex)
      if (addrs.length) {
        const settled = await publicClient.getLogs({ address: addrs, event: eventAbi(vaultAbi, 'Settled'), fromBlock: cursor, toBlock })
        for (const l of settled as any[]) {
          record({ tx: l.transactionHash, payer: l.args.payer, vault: l.address, amount: String(l.args.amount), at: await timeOf(l.blockNumber) })
        }
      }
      cursor = toBlock + 1n
      indexedHead = toBlock
    }
  } catch (e) { console.warn('indexer:', (e as Error).message.split('\n')[0]) }
  setTimeout(indexChain, 5_000)
}
indexChain()

// --- facilitator -----------------------------------------------------------------------------------
const { facilitator, relayer } = createFacilitator({ relayerKey: env('RELAYER_PRIVATE_KEY'), factory: FACTORY, onSettled: record })
const localFacilitator = {
  verify: (p: any, r: any) => facilitator.verify(p, r),
  settle: (p: any, r: any) => facilitator.settle(p, r),
  getSupported: async () => facilitator.getSupported() as any,
}

const relayerBalance = async () =>
  (await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [relayer] })) as bigint

/** Policy for the public facilitator: Arc only, MonkeVault pay-to only, above the minimum amount. */
async function checkPolicy(body: any): Promise<string | null> {
  const req = body?.paymentRequirements
  const auth = body?.paymentPayload?.payload?.authorization
  if (!req || !auth) return 'invalid_request'
  if (req.network !== NETWORK) return 'unsupported_network'
  if (req.asset && getAddress(req.asset) !== getAddress(USDC)) return 'unsupported_asset'
  if (!isAddress(req.payTo) || !(await isKnownVault(req.payTo))) return 'pay_to_not_a_monkevault'
  try { if (BigInt(auth.value) < MIN_SETTLE_ATOMIC) return 'amount_below_minimum' } catch { return 'invalid_amount' }
  return null
}

const app = new Hono()
app.use('*', secureHeaders({ crossOriginResourcePolicy: 'cross-origin', contentSecurityPolicy: undefined }))
app.use('/api/*', cors({ origin: '*', exposeHeaders: ['PAYMENT-REQUIRED', 'PAYMENT-RESPONSE', 'X-PAYMENT-RESPONSE'] }))
app.use('/facilitator/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'] }))
app.use('/facilitator/*', bodyLimit({ maxSize: 32 * 1024 }))

const ip = (c: Context) => c.req.header('x-forwarded-for')?.split(',')[0].trim() || c.req.header('x-real-ip') || 'unknown'
const verifyLimit = rateLimit({ windowMs: 60_000, max: 60 })
const settleLimit = rateLimit({ windowMs: 60_000, max: 20 })

// Public x402 facilitator for Arc. Any x402 resource server can point its facilitator URL here.
app.get('/facilitator/supported', async (c) => c.json(await facilitator.getSupported()))
app.post('/facilitator/verify', async (c) => {
  if (!verifyLimit(ip(c))) return c.json({ isValid: false, invalidReason: 'rate_limited' }, 429)
  const body = await c.req.json().catch(() => null)
  const denied = await checkPolicy(body)
  if (denied) return c.json({ isValid: false, invalidReason: denied }, 400)
  return c.json(await facilitator.verify(body.paymentPayload, body.paymentRequirements))
})
app.post('/facilitator/settle', async (c) => {
  if (!settleLimit(ip(c))) return c.json({ success: false, errorReason: 'rate_limited', transaction: '', network: NETWORK }, 429)
  const body = await c.req.json().catch(() => null)
  const denied = await checkPolicy(body)
  if (denied) return c.json({ success: false, errorReason: denied, transaction: '', network: NETWORK }, 400)
  if ((await relayerBalance()) < MIN_RELAYER_ATOMIC) {
    return c.json({ success: false, errorReason: 'facilitator_out_of_gas', transaction: '', network: NETWORK }, 503)
  }
  return c.json(await facilitator.settle(body.paymentPayload, body.paymentRequirements))
})

// --- paid API: Arc wallet snapshot, $0.01 per call, paid to the demo seller's MonkeVault ----------
const walletLimit = rateLimit({ windowMs: 60_000, max: 30 })
app.use('/api/wallet/*', async (c, next) => {
  if (!walletLimit(ip(c))) return c.json({ error: 'rate_limited' }, 429)
  await next()
})
const resourceServer = new x402ResourceServer(localFacilitator as any).register(NETWORK, new ExactEvmScheme())
app.use(paymentMiddleware({
  'GET /api/wallet/*': {
    accepts: { scheme: 'exact', network: NETWORK, payTo: vault, price: PRICE },
    description: 'Arc wallet snapshot: USDC/EURC balances, activity and recent USDC flows (~25 min)',
    mimeType: 'application/json',
  },
}, resourceServer))

app.get('/api/wallet/:address', async (c) => {
  const a = c.req.param('address')
  if (!isAddress(a)) return c.json({ error: 'invalid address' }, 400)
  const address = getAddress(a)
  const head = await publicClient.getBlockNumber()
  const event = eventAbi(erc20Abi, 'Transfer')
  const [usdcBal, eurcBal, nonce, code] = await Promise.all([
    publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    publicClient.readContract({ address: EURC, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    publicClient.getTransactionCount({ address }),
    publicClient.getCode({ address }),
  ])
  // Arc RPC caps eth_getLogs at 1,000 blocks (~8 min); scan the last ~25 min in windows, gently.
  const WINDOWS = 3
  const logs: any[] = []
  let scanned = 0
  for (let i = 0; i < WINDOWS; i++) {
    const w = { fromBlock: head - BigInt((i + 1) * 1000) + 1n, toBlock: head - BigInt(i * 1000) }
    try {
      const [out, inn] = await Promise.all([
        publicClient.getLogs({ address: USDC, event, args: { from: address }, ...w }),
        publicClient.getLogs({ address: USDC, event, args: { to: address }, ...w }),
      ])
      logs.push(out, inn); scanned++
    } catch { break } // partial history beats a failed (and therefore unpaid) response
  }
  const flows = (logs as any[]).flat().map((l) => ({
    direction: getAddress(l.args.from) === address ? 'out' : 'in',
    counterparty: getAddress(l.args.from) === address ? l.args.to : l.args.from,
    usdc: usd(l.args.value), block: Number(l.blockNumber), tx: l.transactionHash,
  })).sort((x, y) => y.block - x.block)
  const sum = (d: string) => flows.filter((f) => f.direction === d).reduce((s, f) => s + Number(f.usdc), 0)
  const counterparties = Object.entries(flows.reduce<Record<string, number>>((m, f) => ((m[f.counterparty] = (m[f.counterparty] || 0) + 1), m), {}))
    .sort((x, y) => y[1] - x[1]).slice(0, 5).map(([address, transfers]) => ({ address, transfers }))
  return c.json({
    address, network: NETWORK, kind: code && code !== '0x' ? 'contract' : 'eoa',
    balances: { usdc: usd(usdcBal as bigint), eurc: usd(eurcBal as bigint) },
    txCount: nonce,
    recent25m: { blocksScanned: scanned * 1000, transfers: flows.length, inUsdc: sum('in').toFixed(6), outUsdc: sum('out').toFixed(6), topCounterparties: counterparties, recent: flows.slice(0, 20) },
    explorer: `${EXPLORER}/address/${address}`,
  })
})

// --- free endpoints ---------------------------------------------------------------------------------
app.get('/api/config', (c) => {
  const origin = new URL(c.req.url).origin.replace(/^http:/, c.req.header('x-forwarded-proto') === 'https' ? 'https:' : 'http:')
  return c.json({
    chainId: 5042, network: NETWORK, usdc: USDC, factory: FACTORY, demoVault: vault, demoSeller: SELLER, relayer,
    price: PRICE, explorer: EXPLORER, facilitatorUrl: `${origin}/facilitator`, feeBps, minSettleAtomic: String(MIN_SETTLE_ATOMIC),
  })
})
app.get('/api/stats', (c) => {
  const total = settlements.reduce((s, r) => s + BigInt(r.amount), 0n)
  return c.json({
    network: NETWORK, factory: FACTORY, vault, seller: SELLER, relayer, price: PRICE,
    payments: settlements.length, volumeUsdc: usd(total), feesUsdc: usd((total * BigInt(feeBps)) / 10_000n),
    payers: new Set(settlements.map((s) => s.payer.toLowerCase())).size, sellers: vaults.size,
    indexedBlock: Number(indexedHead), recent: settlements.slice(0, 50),
  })
})
app.get('/api/vaults', (c) => c.json([...vaults.values()].sort((a, b) => b.at - a.at)))
app.get('/health', async (c) => {
  const bal = await relayerBalance().catch(() => -1n)
  return c.json({ ok: true, relayer, relayerUsdc: bal >= 0n ? usd(bal) : 'unknown', indexedBlock: Number(indexedHead) })
})

// --- frontend: static Next.js export (web/out); falls back to the built-in dashboard if not built ---
const WEB = process.env.WEB_DIR || './web/out'
if (existsSync(WEB)) {
  app.use('/*', serveStatic({ root: WEB }))
  const notFound = existsSync(`${WEB}/404.html`) ? readFileSync(`${WEB}/404.html`, 'utf8') : 'Not found'
  app.notFound((c) => c.html(notFound, 404))
} else {
  app.get('/', (c) => c.html(dashboardHtml({ factory: FACTORY, vault, seller: SELLER, relayer, price: PRICE, explorer: EXPLORER })))
}
serve({ fetch: app.fetch, port: PORT }, () => console.log(`MonkePay on Arc listening on :${PORT} (vault ${vault})`))
