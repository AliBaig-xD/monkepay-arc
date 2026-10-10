import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { paymentMiddleware, x402ResourceServer } from '@x402/hono'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { getAddress, isAddress, type Hex } from 'viem'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createFacilitator, type SettlementRecord } from './facilitator.js'
import { publicClient, factoryAbi, erc20Abi, NETWORK, USDC, EURC, EXPLORER, usd } from './arc.js'
import { dashboardHtml } from './dashboard.js'

const env = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`missing env ${k}`); return v }
const FACTORY = getAddress(env('FACTORY_ADDRESS')) as Hex
const SELLER = getAddress(env('SELLER_ADDRESS')) as Hex
const PRICE = process.env.PRICE_USD || '$0.01'
const PORT = Number(process.env.PORT || 4021)

// --- settlement log (small JSON file; the chain is the source of truth) -------------------------
const DATA = process.env.DATA_DIR || './data'
mkdirSync(DATA, { recursive: true })
const LOG = `${DATA}/settlements.json`
const settlements: SettlementRecord[] = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf8')) : []
const record = (r: SettlementRecord) => { settlements.unshift(r); writeFileSync(LOG, JSON.stringify(settlements.slice(0, 500))) }

// --- facilitator -----------------------------------------------------------------------------------
const { facilitator, relayer } = createFacilitator({ relayerKey: env('RELAYER_PRIVATE_KEY'), factory: FACTORY, onSettled: record })
const localFacilitator = {
  verify: (p: any, r: any) => facilitator.verify(p, r),
  settle: (p: any, r: any) => facilitator.settle(p, r),
  getSupported: async () => facilitator.getSupported() as any,
}

const vault = (await publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'vaultOf', args: [SELLER] })) as Hex
if (/^0x0+$/.test(vault)) throw new Error(`no vault for seller ${SELLER}; run scripts/deploy.ts first`)

const app = new Hono()

// Public x402 facilitator endpoints for Arc (any x402 resource server can point at these).
app.get('/facilitator/supported', async (c) => c.json(await facilitator.getSupported()))
app.post('/facilitator/verify', async (c) => {
  const { paymentPayload, paymentRequirements } = await c.req.json()
  return c.json(await facilitator.verify(paymentPayload, paymentRequirements))
})
app.post('/facilitator/settle', async (c) => {
  const { paymentPayload, paymentRequirements } = await c.req.json()
  return c.json(await facilitator.settle(paymentPayload, paymentRequirements))
})

// --- paid API: Arc wallet snapshot, $0.01 per call, paid to the seller's MonkeVault ---------------
const resourceServer = new x402ResourceServer(localFacilitator as any).register(NETWORK, new ExactEvmScheme())
app.use(paymentMiddleware({
  'GET /api/wallet/*': {
    accepts: { scheme: 'exact', network: NETWORK, payTo: vault, price: PRICE },
    description: 'Arc wallet snapshot: USDC/EURC balances, activity and recent USDC flows',
    mimeType: 'application/json',
  },
}, resourceServer))

app.get('/api/wallet/:address', async (c) => {
  const a = c.req.param('address')
  if (!isAddress(a)) return c.json({ error: 'invalid address' }, 400)
  const address = getAddress(a)
  const head = await publicClient.getBlockNumber()
  const event = erc20Abi[1]
  // Arc RPC caps eth_getLogs at 1,000 blocks (~8 minutes); scan the last ~hour in parallel windows.
  const windows = Array.from({ length: 7 }, (_, i) => ({ fromBlock: head - BigInt((i + 1) * 1000) + 1n, toBlock: head - BigInt(i * 1000) }))
  const [usdcBal, eurcBal, nonce, code, ...logs] = await Promise.all([
    publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    publicClient.readContract({ address: EURC, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    publicClient.getTransactionCount({ address }),
    publicClient.getCode({ address }),
    ...windows.flatMap((w) => [
      publicClient.getLogs({ address: USDC, event, args: { from: address }, ...w }),
      publicClient.getLogs({ address: USDC, event, args: { to: address }, ...w }),
    ]),
  ])
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
    lastHour: { blocks: [Number(head) - 7000, Number(head)], transfers: flows.length, inUsdc: sum('in').toFixed(6), outUsdc: sum('out').toFixed(6), topCounterparties: counterparties, recent: flows.slice(0, 20) },
    explorer: `${EXPLORER}/address/${address}`,
  })
})

// --- free endpoints ---------------------------------------------------------------------------------
app.get('/api/stats', async (c) => {
  const total = settlements.reduce((s, r) => s + BigInt(r.amount), 0n)
  return c.json({
    network: NETWORK, factory: FACTORY, vault, seller: SELLER, relayer, price: PRICE,
    payments: settlements.length, volumeUsdc: usd(total), payers: new Set(settlements.map((s) => s.payer.toLowerCase())).size,
    recent: settlements.slice(0, 25),
  })
})
app.get('/health', (c) => c.json({ ok: true }))
app.get('/', (c) => c.html(dashboardHtml({ factory: FACTORY, vault, seller: SELLER, relayer, price: PRICE, explorer: EXPLORER })))

serve({ fetch: app.fetch, port: PORT }, () => console.log(`MonkePay on Arc listening on :${PORT} (vault ${vault})`))
