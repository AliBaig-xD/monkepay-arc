import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { paymentMiddleware, x402ResourceServer } from '@x402/hono'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { getAddress, isAddress, type Hex } from 'viem'
import { createFacilitator, type SettlementRecord } from './facilitator.js'
import { publicClient, factoryAbi, vaultAbi, erc20Abi, NETWORK, USDC, EURC, EXPLORER, usd } from './arc.js'
import { dashboardHtml } from './dashboard.js'

const env = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`missing env ${k}`); return v }
const FACTORY = getAddress(env('FACTORY_ADDRESS')) as Hex
const SELLER = getAddress(env('SELLER_ADDRESS')) as Hex
const PRICE = process.env.PRICE_USD || '$0.01'
const PORT = Number(process.env.PORT || 4021)

// --- settlements: indexed from the vault's on-chain Settled events (the chain is the source of truth) ---
const settlements: SettlementRecord[] = []
const seenTx = new Set<string>()
const record = (r: SettlementRecord) => {
  if (seenTx.has(r.tx)) return
  seenTx.add(r.tx)
  settlements.push(r)
  settlements.sort((a, b) => b.at - a.at)
}

// --- facilitator -----------------------------------------------------------------------------------
const { facilitator, relayer } = createFacilitator({ relayerKey: env('RELAYER_PRIVATE_KEY'), factory: FACTORY, onSettled: record })
const localFacilitator = {
  verify: (p: any, r: any) => facilitator.verify(p, r),
  settle: (p: any, r: any) => facilitator.settle(p, r),
  getSupported: async () => facilitator.getSupported() as any,
}

const vault = (await publicClient.readContract({ address: FACTORY, abi: factoryAbi, functionName: 'vaultOf', args: [SELLER] })) as Hex
if (/^0x0+$/.test(vault)) throw new Error(`no vault for seller ${SELLER}; run scripts/deploy.ts first`)

// Backfill + follow Settled events. Arc caps eth_getLogs at 1,000 blocks, so walk forward in windows.
let cursor = BigInt(process.env.START_BLOCK || '0')
async function indexSettlements() {
  try {
    const head = await publicClient.getBlockNumber()
    while (cursor <= head) {
      const toBlock = cursor + 999n > head ? head : cursor + 999n
      const logs = await publicClient.getLogs({ address: vault, event: vaultAbi.find((x) => x.type === 'event' && x.name === 'Settled') as any, fromBlock: cursor, toBlock })
      for (const l of logs as any[]) {
        const block = await publicClient.getBlock({ blockNumber: l.blockNumber })
        record({ tx: l.transactionHash, payer: l.args.payer, vault, amount: String(l.args.amount), at: Number(block.timestamp) * 1000 })
      }
      cursor = toBlock + 1n
    }
  } catch (e) { console.warn('indexer:', (e as Error).message.split('\n')[0]) }
  setTimeout(indexSettlements, 5_000)
}
indexSettlements()

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
    description: 'Arc wallet snapshot: USDC/EURC balances, activity and recent USDC flows (~25 min)',
    mimeType: 'application/json',
  },
}, resourceServer))

app.get('/api/wallet/:address', async (c) => {
  const a = c.req.param('address')
  if (!isAddress(a)) return c.json({ error: 'invalid address' }, 400)
  const address = getAddress(a)
  const head = await publicClient.getBlockNumber()
  const event = erc20Abi[1]
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
