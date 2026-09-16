/**
 * @jest-environment node
 */
import { addressToScriptPk, publicKeyToAddress } from '@opcat-labs/wallet-sdk/lib/address';
import { NetworkType } from '@opcat-labs/wallet-sdk/lib/network';
import { AddressType } from '@opcat-labs/wallet-sdk/lib/types';

import {
  assertAllowedSighashTypes,
  assertSignRequestSighashAllowed,
  checkInputIndex,
  formatUserToSignInputs,
  PsbtLike,
  selectAccountInputs,
  SIGHASH_ALL
} from './toSignInputs';

const NET = NetworkType.MAINNET;
const pubkey = '02' + 'ab'.repeat(32);
const otherPubkey = '03' + 'cd'.repeat(32);
const account = { pubkey, address: publicKeyToAddress(pubkey, AddressType.P2PKH, NET) };
const ownScript = addressToScriptPk(account.address, NET);
const otherScript = addressToScriptPk(publicKeyToAddress(otherPubkey, AddressType.P2PKH, NET), NET);

// OPCAT PSBT shape: no witnessUtxo / nonWitnessUtxo, previous output only via getInputOutput().
function opcatPsbt(inputs: { script: Buffer; sighashType?: number; partialSig?: unknown[] }[]): PsbtLike {
  return {
    data: { inputs: inputs.map(({ sighashType, partialSig }) => ({ sighashType, partialSig })) },
    getInputOutput: (i) => ({ script: inputs[i].script })
  };
}

describe('selectAccountInputs (auto-detect)', () => {
  it('selects only the inputs paying the current account, with SIGHASH_ALL', () => {
    const psbt = opcatPsbt([{ script: ownScript }, { script: otherScript }, { script: ownScript }]);
    expect(selectAccountInputs(psbt, account, NET)).toEqual([
      { index: 0, publicKey: pubkey, sighashTypes: [SIGHASH_ALL] },
      { index: 2, publicKey: pubkey, sighashTypes: [SIGHASH_ALL] }
    ]);
  });

  it('refuses a PSBT with none of the account inputs instead of signing everything', () => {
    const psbt = opcatPsbt([{ script: otherScript }, { script: otherScript }]);
    expect(() => selectAccountInputs(psbt, account, NET)).toThrow('no input of the current account');
  });

  it('skips already-signed inputs', () => {
    const psbt = opcatPsbt([{ script: ownScript, partialSig: [{}] }, { script: otherScript }]);
    expect(() => selectAccountInputs(psbt, account, NET)).toThrow('no input of the current account');
  });

  it('refuses an account input whose PSBT field declares a non-ALL sighash', () => {
    const psbt = opcatPsbt([{ script: ownScript, sighashType: 0x02 }]);
    expect(() => selectAccountInputs(psbt, account, NET)).toThrow('declares sighash type 2');
  });

  it('falls back to witnessUtxo for bitcoinjs-style PSBTs', () => {
    const psbt: PsbtLike = {
      data: { inputs: [{ witnessUtxo: { script: otherScript } }, { witnessUtxo: { script: ownScript } }] }
    };
    expect(selectAccountInputs(psbt, account, NET)).toEqual([
      { index: 1, publicKey: pubkey, sighashTypes: [SIGHASH_ALL] }
    ]);
  });
});

describe('formatUserToSignInputs (explicit toSignInputs)', () => {
  const psbt = opcatPsbt([{ script: ownScript }, { script: ownScript }]);

  it('accepts SIGHASH_ALL and normalises the whitelist', () => {
    const out = formatUserToSignInputs(psbt, [{ index: 0, publicKey: pubkey, sighashTypes: [1] }], account);
    expect(out).toEqual([{ index: 0, publicKey: pubkey, sighashTypes: [SIGHASH_ALL] }]);
  });

  it('pins the whitelist to SIGHASH_ALL when the page passes none', () => {
    const out = formatUserToSignInputs(psbt, [{ index: 1, address: account.address, sighashTypes: undefined }], account);
    expect(out[0].sighashTypes).toEqual([SIGHASH_ALL]);
  });

  it.each([[0x02], [0x03], [0x81], [0x82], [0x83]])('refuses sighash type 0x%s', (t) => {
    expect(() =>
      formatUserToSignInputs(psbt, [{ index: 0, publicKey: pubkey, sighashTypes: [t] }], account)
    ).toThrow('not allowed');
  });

  it('refuses a mixed list that contains a disallowed type', () => {
    expect(() =>
      formatUserToSignInputs(psbt, [{ index: 0, publicKey: pubkey, sighashTypes: [1, 0x82] }], account)
    ).toThrow('not allowed');
  });

  it('refuses when the referenced input itself declares a non-ALL sighash', () => {
    const declared = opcatPsbt([{ script: ownScript, sighashType: 0x82 }]);
    expect(() =>
      formatUserToSignInputs(declared, [{ index: 0, publicKey: pubkey, sighashTypes: undefined }], account)
    ).toThrow('declares sighash type 130');
  });

  it.each([[-1], [2], [1.5], [null], ['x'], [undefined]])('refuses index %p', (index) => {
    expect(() =>
      formatUserToSignInputs(psbt, [{ index: index as number, publicKey: pubkey, sighashTypes: undefined }], account)
    ).toThrow('invalid index');
  });

  it('refuses a foreign address or public key', () => {
    expect(() =>
      formatUserToSignInputs(psbt, [{ index: 0, publicKey: otherPubkey, sighashTypes: undefined }], account)
    ).toThrow('invalid public key');
    expect(() =>
      formatUserToSignInputs(psbt, [{ index: 0, address: '1BitcoinEaterAddressDontSendf59kuE', sighashTypes: undefined }], account)
    ).toThrow('invalid address');
  });
});

describe('checkInputIndex / assertAllowedSighashTypes', () => {
  it('coerces numeric strings and rejects null (which Number() would turn into 0)', () => {
    expect(checkInputIndex('1', 2)).toBe(1);
    expect(() => checkInputIndex(null, 2)).toThrow('invalid index');
  });

  it('accepts undefined and [1], rejects anything else', () => {
    expect(() => assertAllowedSighashTypes(undefined)).not.toThrow();
    expect(() => assertAllowedSighashTypes([1])).not.toThrow();
    expect(() => assertAllowedSighashTypes([2])).toThrow('not allowed');
    expect(() => assertAllowedSighashTypes(['a'])).toThrow('invalid sighash type');
    expect(() => assertAllowedSighashTypes(1)).toThrow('invalid sighash type');
  });
});

describe('assertSignRequestSighashAllowed (pre-approval gate)', () => {
  it('checks only the referenced inputs when toSignInputs is explicit', () => {
    const psbt = opcatPsbt([{ script: ownScript }, { script: otherScript, sighashType: 0x03 }]);
    expect(() =>
      assertSignRequestSighashAllowed(psbt, [{ index: 0, publicKey: pubkey, sighashTypes: undefined }])
    ).not.toThrow();
    expect(() =>
      assertSignRequestSighashAllowed(psbt, [{ index: 1, publicKey: pubkey, sighashTypes: undefined }])
    ).toThrow('declares sighash type 3');
    expect(() =>
      assertSignRequestSighashAllowed(psbt, [{ index: 0, publicKey: pubkey, sighashTypes: [0x82] }])
    ).toThrow('not allowed');
  });

  it('checks every unsigned input when auto-detecting', () => {
    const clean = opcatPsbt([{ script: ownScript }, { script: otherScript }]);
    expect(() => assertSignRequestSighashAllowed(clean)).not.toThrow();
    const declared = opcatPsbt([{ script: ownScript }, { script: otherScript, sighashType: 0x02 }]);
    expect(() => assertSignRequestSighashAllowed(declared)).toThrow('declares sighash type 2');
    const signed = opcatPsbt([{ script: ownScript }, { script: otherScript, sighashType: 0x02, partialSig: [{}] }]);
    expect(() => assertSignRequestSighashAllowed(signed)).not.toThrow();
  });
});
