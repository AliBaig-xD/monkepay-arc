// Deploy MonkeVaultFactory to Arc mainnet and create the demo seller's vault.
// Usage: npx tsx scripts/deploy.ts   (needs DEPLOYER_PRIVATE_KEY, SELLER_ADDRESS, PLATFORM_ADDRESS in .env)
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { getAddress, type Hex } from 'viem'
import { publicClient, walletFor, factoryAbi, USDC, FEES, EXPLORER, usd, erc20Abi } from '../src/arc.js'

const art = JSON.parse(readFileSync('out/MonkeVault.sol/MonkeVaultFactory.json', 'utf8'))
const wallet = walletFor(process.env.DEPLOYER_PRIVATE_KEY)
const seller = getAddress(process.env.SELLER_ADDRESS!)
const platform = getAddress(process.env.PLATFORM_ADDRESS!)
const feeBps = Number(process.env.FEE_BPS || 100)

const bal = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [wallet.account.address] })
console.log(`deployer ${wallet.account.address} balance ${usd(bal as bigint)} USDC`)

let factory = process.env.FACTORY_ADDRESS as Hex | undefined
if (!factory) {
  const hash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode.object, args: [USDC, platform, feeBps], ...FEES })
  const r = await publicClient.waitForTransactionReceipt({ hash })
  factory = r.contractAddress!
  console.log(`factory  ${factory}  ${EXPLORER}/tx/${hash}  gas ${r.gasUsed} (${usd((r.gasUsed * r.effectiveGasPrice) / 10n ** 12n)} USDC)`)
}

const hash = await wallet.writeContract({ address: factory, abi: factoryAbi, functionName: 'createVault', args: [seller], ...FEES })
const r = await publicClient.waitForTransactionReceipt({ hash })
const vault = await publicClient.readContract({ address: factory, abi: factoryAbi, functionName: 'vaultOf', args: [seller] })
console.log(`vault    ${vault}  ${EXPLORER}/tx/${hash}  status ${r.status}`)
console.log(`\nAdd to .env:\nFACTORY_ADDRESS=${factory}`)
