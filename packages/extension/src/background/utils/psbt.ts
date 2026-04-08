import { Psbt, ExtPsbt } from '@opcat-labs/scrypt-ts-opcat';
import { bitcoin } from '@opcat-labs/wallet-sdk/lib/bitcoin-core';

export function psbtFromHex<T=bitcoin.Psbt>(hex: string): T {
    // let error: Error
    // try {
    //     return bitcoin.Psbt.fromHex(hex) as T;
    // } catch (e) {
    //     // error = e as Error
    // }
    return Psbt.fromHex(hex) as T
}

export function psbtFromBase64<T=bitcoin.Psbt>(base64: string): T {
    // let error: Error
    // try {
    //     return bitcoin.Psbt.fromBase64(base64) as T;
    // } catch (e) {
    //     // error = e as Error
    // }
    return Psbt.fromBase64(base64) as T
}

/**
 * Estimate PSBT size and fee info using ExtPsbt's calculation.
 * Creates a temporary ExtPsbt for estimation only — does not affect signing.
 *
 * ExtPsbt.estimateSize() properly handles:
 * - Output sizes including data fields (OP_RETURN, opcat data)
 * - P2PKH input signature size prediction (73 + 33 + varint)
 * - Proper varint-encoded input/output counts and tx overhead
 */
export function estimatePsbtFeeInfo(psbtHex: string): {
  estimatedSize: number;
  actualFee: number;
  feeRate: number;
} {
  const extPsbt = ExtPsbt.fromHex(psbtHex);
  const estimatedSize = extPsbt.estimateSize();
  const actualFee = Number(extPsbt.inputAmount - extPsbt.outputAmount);
  const feeRate = estimatedSize > 0 ? actualFee / estimatedSize : 0;
  return { estimatedSize, actualFee, feeRate };
}