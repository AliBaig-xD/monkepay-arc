import { x402Facilitator } from '@x402/core/facilitator'
import type { PaymentPayload, PaymentRequirements, SettleResponse, VerifyResponse, FacilitatorContext } from '@x402/core/types'
import { ExactEvmScheme } from '@x402/evm/exact/facilitator'
import { toFacilitatorEvmSigner, isEIP3009Payload } from '@x402/evm'
import { getAddress, type Hex } from 'viem'
import { publicClient, walletFor, factoryAbi, vaultAbi, NETWORK, FEES } from './arc.js'

export type SettlementRecord = {
  tx: Hex; payer: string; vault: string; amount: string; resource?: string; at: number
}

/**
 * x402 "exact" scheme for Arc that understands MonkeVaults.
 * Verification is delegated to the reference EIP-3009 implementation. When the pay-to address is a
 * MonkeVault, settlement goes through vault.settle() so the seller/platform split happens atomically
 * on-chain; otherwise it falls back to a plain transferWithAuthorization.
 */
class VaultAwareExactScheme {
  readonly scheme = 'exact'
  readonly caipFamily = 'eip155:*'
  private vaultCache = new Map<string, boolean>()

  constructor(
    private inner: ExactEvmScheme,
    private wallet: ReturnType<typeof walletFor>,
    private factory: Hex,
    private onSettled: (r: SettlementRecord) => void,
  ) {}

  getExtra(n: string) { return this.inner.getExtra(n) }
  getSigners(n: string) { return this.inner.getSigners(n) }

  async verify(p: PaymentPayload, r: PaymentRequirements, ctx?: FacilitatorContext): Promise<VerifyResponse> {
    const v = await this.inner.verify(p, r, ctx)
    if (!v.isValid) console.warn(`verify rejected: ${v.invalidReason} ${v.invalidMessage ?? ''} payer=${v.payer ?? '?'}`)
    return v
  }

  private async isVault(addr: string) {
    const key = addr.toLowerCase()
    if (!this.vaultCache.has(key)) {
      const ok = await publicClient.readContract({ address: this.factory, abi: factoryAbi, functionName: 'isVault', args: [getAddress(addr)] })
      this.vaultCache.set(key, ok as boolean)
    }
    return this.vaultCache.get(key)!
  }

  async settle(p: PaymentPayload, r: PaymentRequirements, ctx?: FacilitatorContext): Promise<SettleResponse> {
    const inner = (p as any).payload
    if (!isEIP3009Payload(inner) || !(await this.isVault(r.payTo))) {
      return this.inner.settle(p, r, ctx)
    }
    // Re-verify immediately before broadcasting (signature, amount, time window, nonce unused, balance).
    const v = await this.inner.verify(p, r, ctx)
    if (!v.isValid) {
      return { success: false, errorReason: v.invalidReason, errorMessage: v.invalidMessage, transaction: '', network: r.network, payer: v.payer } as SettleResponse
    }
    const a = inner.authorization
    const hash = await this.wallet.writeContract({
      address: getAddress(r.payTo),
      abi: vaultAbi,
      functionName: 'settle',
      args: [getAddress(a.from), BigInt(a.value), BigInt(a.validAfter), BigInt(a.validBefore), a.nonce as Hex, inner.signature as Hex],
      ...FEES,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 })
    if (receipt.status !== 'success') {
      return { success: false, errorReason: 'transaction_failed', transaction: hash, network: r.network, payer: a.from } as SettleResponse
    }
    this.onSettled({ tx: hash, payer: a.from, vault: r.payTo, amount: a.value, resource: (p as any).resource?.url, at: Date.now() })
    return { success: true, transaction: hash, network: r.network, payer: a.from } as SettleResponse
  }
}

export function createFacilitator(opts: { relayerKey: string; factory: Hex; onSettled: (r: SettlementRecord) => void }) {
  const wallet = walletFor(opts.relayerKey)
  const signer = toFacilitatorEvmSigner({ ...wallet, address: wallet.account.address } as any, { confirmationTimeoutMs: 30_000 })
  const inner = new ExactEvmScheme(signer)
  const facilitator = new x402Facilitator()
  facilitator.register(NETWORK, new VaultAwareExactScheme(inner, wallet, opts.factory, opts.onSettled) as any)
  return { facilitator, relayer: wallet.account.address }
}
