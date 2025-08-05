import { ExtPsbt, DefaultSigner, PrivateKey, Networks, fromSupportedNetwork, hexToUint8Array } from '@opcat-labs/scrypt-ts-opcat'
import { bitcoin, ECPairInterface } from './bitcoin-core'

export class WrapSigner {
  constructor(private readonly signer: bitcoin.Signer) { }

  get publicKey(): Uint8Array {
    return new Uint8Array(this.signer.publicKey)
  }

  get network(): any {
    return this.signer.network
  }

  sign(hash: Uint8Array, _lowR?: boolean): Uint8Array {
    hash = hash.reverse()
    const sig = toDerSig(new Uint8Array(this.signer.sign(Buffer.from(hash), _lowR)))
    return sig
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


/**
 * Convert 64-byte ECDSA signature to DER format
 * @param sig 64-byte signature (32r + 32s)
 * @returns DER encoded signature
 */
export function toDerSig(sig: Uint8Array): Uint8Array {
  // Input validation
  if (sig.length !== 64) {
    throw new Error('Invalid signature length. Expected 64 bytes');
  }

  // Separate r/s values (ignore the last sighashtype)
  const r = sig.subarray(0, 32);
  const s = sig.subarray(32, 64);

  // Process r value
  let rBytes = new Uint8Array(r);
  if (r[0] & 0x80) { // Check if the highest bit is 1
    rBytes = new Uint8Array([0x00, ...r]);
  }

  // Process s value
  let sBytes = new Uint8Array(s);
  if (s[0] & 0x80) { // Check if the highest bit is 1
    sBytes = new Uint8Array([0x00, ...s]);
  }

  // Build DER components
  const derComponents = [
    new Uint8Array([0x30]), // SEQUENCE
    encodeLength(2 + rBytes.length + 2 + sBytes.length), // Total length
    new Uint8Array([0x02]), // INTEGER
    encodeLength(rBytes.length),
    rBytes,
    new Uint8Array([0x02]), // INTEGER
    encodeLength(sBytes.length),
    sBytes
  ];

  // Combine all parts
  return concatUint8Arrays(derComponents);
}

/** Encode ASN.1 length field */
function encodeLength(length: number): Uint8Array {
  if (length < 0x80) {
    return new Uint8Array([length]);
  }
  const lenBytes = [];
  let n = length;
  while (n > 0) {
    lenBytes.unshift(n & 0xff);
    n = n >> 8;
  }
  return new Uint8Array([0x80 | lenBytes.length, ...lenBytes]);
}

/** Concatenate Uint8Array arrays */
function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}