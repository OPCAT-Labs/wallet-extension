import { ExtPsbt, DefaultSigner, PrivateKey, Networks, fromSupportedNetwork, hexToUint8Array } from '@opcat-labs/scrypt-ts-opcat'
import { bitcoin, ECPairInterface } from './bitcoin-core'

/**
 * Converts a buffer to a DER-encoded buffer.
 * Removes leading zeros unless the next byte's MSB is 1.
 * @param x - The buffer to be converted.
 * @returns The DER-encoded buffer.
 */
function toDER(x: Uint8Array): Uint8Array {
  let i = 0
  // Remove leading zeros
  while (x[i] === 0) ++i

  // If all zeros, return single zero byte
  if (i === x.length) return new Uint8Array([0])

  // Remove leading zeros
  x = x.slice(i)

  // Add leading zero if MSB is set (to indicate positive number)
  if (x[0] & 0x80) {
    const result = new Uint8Array(x.length + 1)
    result[0] = 0
    result.set(x, 1)
    return result
  }

  return x
}

/**
 * Encodes a 64-byte raw signature (r || s) into DER format.
 * @param sig - Raw 64-byte signature
 * @returns DER-encoded signature
 */
function toDerSig(sig: Uint8Array): Uint8Array {
  const r = toDER(sig.subarray(0, 32))
  const s = toDER(sig.subarray(32, 64))

  const lenR = r.length
  const lenS = s.length
  const totalLen = 6 + lenR + lenS

  const result = new Uint8Array(totalLen)

  // DER format: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
  result[0] = 0x30                    // SEQUENCE tag
  result[1] = totalLen - 2            // Total length (excluding first 2 bytes)
  result[2] = 0x02                    // INTEGER tag for R
  result[3] = lenR                    // R length
  result.set(r, 4)                    // R value
  result[4 + lenR] = 0x02             // INTEGER tag for S
  result[5 + lenR] = lenS             // S length
  result.set(s, 6 + lenR)             // S value

  return result
}

export class WrapSigner {
  constructor(private readonly signer: bitcoin.Signer) { }

  get publicKey(): Uint8Array {
    return new Uint8Array(this.signer.publicKey)
  }

  get network(): any {
    return this.signer.network
  }

  sign(hash: Uint8Array, _lowR?: boolean): Uint8Array {
    // Reverse hash for OpCat compatibility
    hash = hash.reverse()

    // Get raw 64-byte signature (r: 32 bytes + s: 32 bytes)
    const rawSig = this.signer.sign(Buffer.from(hash), _lowR)

    // Convert to DER encoding for OpCat's ExtPsbt
    // OpCat's signatureutils.encode() expects DER-encoded signatures (68-72 bytes)
    const derSig = toDerSig(new Uint8Array(rawSig))

    return derSig
  }

  signSchnorr(hash: Uint8Array): Uint8Array {
    throw new Error('Schnorr signing is not supported')
  }

  getPublicKey(): Uint8Array {
    return new Uint8Array(this.signer.publicKey)
  }
}

export function wrapSigner(signer: ECPairInterface, psbt: bitcoin.Psbt | ExtPsbt): bitcoin.Signer {
  if (psbt instanceof bitcoin.Psbt) {
    return signer
  }
  // if is signing for opcat, we need to wrap the signer
  return new WrapSigner(signer) as any
}