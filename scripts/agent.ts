// An "agent" that pays for an API call on Arc with the stock x402 client — no MonkePay-specific code.
// Usage: npx tsx scripts/agent.ts [address-to-look-up] [api-base-url]
import 'dotenv/config'
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from '@x402/fetch'
import { ExactEvmScheme } from '@x402/evm'
import { privateKeyToAccount } from 'viem/accounts'
import type { Hex } from 'viem'

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as Hex)
const target = process.argv[2] || '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d' // CCTP TokenMessengerV2 on Arc
const base = process.argv[3] || process.env.API_URL || 'http://localhost:4021'

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: 'eip155:5042', client: new ExactEvmScheme(account) }],
})

const t = Date.now()
const res = await fetchWithPayment(`${base}/api/wallet/${target}`)
const body = await res.json()
const header = res.headers.get('PAYMENT-RESPONSE') || res.headers.get('X-PAYMENT-RESPONSE')
console.log(`HTTP ${res.status} in ${Date.now() - t} ms, paid by ${account.address}`)
if (header) console.log('settlement:', decodePaymentResponseHeader(header))
console.log(JSON.stringify(body, null, 2).slice(0, 1500))
