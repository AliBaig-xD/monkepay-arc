import { createPublicClient, createWalletClient, http, parseAbi, parseGwei, publicActions, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arc } from 'viem/chains'

export const NETWORK = 'eip155:5042' as const
export const USDC = '0x3600000000000000000000000000000000000000' as const
export const EURC = '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1' as const
export const EXPLORER = 'https://explorer.arc.io'

// Arc's mempool silently drops txs below a 20 gwei maxFeePerGas floor; leave headroom.
export const FEES = { maxFeePerGas: parseGwei('40'), maxPriorityFeePerGas: parseGwei('1') }

const rpc = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io'
export const publicClient = createPublicClient({ chain: arc, transport: http(rpc) })

export function walletFor(key: string | undefined) {
  if (!key) throw new Error('missing private key')
  const account = privateKeyToAccount(key as Hex)
  return createWalletClient({ account, chain: arc, transport: http(rpc) }).extend(publicActions)
}

export const erc20Abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
])

export const factoryAbi = parseAbi([
  'function createVault(address seller) returns (address)',
  'function predictVault(address seller) view returns (address)',
  'function vaultOf(address seller) view returns (address)',
  'function isVault(address vault) view returns (bool)',
  'function feeBps() view returns (uint16)',
  'function platform() view returns (address)',
  'event VaultCreated(address indexed seller, address vault)',
])

export const vaultAbi = parseAbi([
  'function settle(address from, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature)',
  'function sweep()',
  'function seller() view returns (address)',
  'function feeBps() view returns (uint16)',
  'event Settled(address indexed payer, bytes32 indexed nonce, uint256 amount, uint256 sellerAmount, uint256 fee)',
  'event Swept(uint256 amount, uint256 sellerAmount, uint256 fee)',
])

export const usd = (raw: bigint) => (Number(raw) / 1e6).toFixed(6).replace(/0{1,4}$/, '')
