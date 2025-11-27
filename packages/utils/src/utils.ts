import BigNumber from 'bignumber.js';
import { ECPair } from './bitcoin-core';

/**
 * ECDSA signature validator
 */
export const validator = (pubkey: Buffer, msghash: Buffer, signature: Buffer): boolean =>
  ECPair.fromPublicKey(pubkey).verify(msghash, signature);

/**
 * Transform satoshis to btc format
 */
export function satoshisToAmount(val: number) {
  const num = new BigNumber(val);
  return num.dividedBy(100000000).toFixed(8);
}

/**
 * Transform btc format to satoshis
 */
export function amountToSatoshis(val: any) {
  const num = new BigNumber(val);
  return num.multipliedBy(100000000).toNumber();
}

export function shortAddress(address?: string, len = 5) {
  if (!address) return '';
  if (address.length <= len * 2) return address;
  return address.slice(0, len) + '...' + address.slice(address.length - len);
}
