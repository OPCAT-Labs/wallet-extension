/**
 * @jest-environment node
 */
import { addressToScriptPk, publicKeyToAddress } from '@opcat-labs/wallet-sdk/lib/address';
import { NetworkType } from '@opcat-labs/wallet-sdk/lib/network';
import { AddressType } from '@opcat-labs/wallet-sdk/lib/types';

import {
  checkInputIndex,
  effectiveSighashType,
  findSighashNoneInputs,
  formatUserToSignInputs,
  isSighashNone,
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
  it('selects only the inputs paying the current account', () => {
    const psbt = opcatPsbt([{ script: ownScript }, { script: otherScript }, { script: ownScript }]);
    expect(selectAccountInputs(psbt, account, NET)).toEqual([
      { index: 0, publicKey: pubkey, sighashTypes: undefined },
      { index: 2, publicKey: pubkey, sighashTypes: undefined }
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

  it('forwards a sighash type declared on the PSBT input as the whitelist', () => {
    const psbt = opcatPsbt([{ script: ownScript, sighashType: 0x02 }]);
    expect(selectAccountInputs(psbt, account, NET)).toEqual([{ index: 0, publicKey: pubkey, sighashTypes: [0x02] }]);
  });

  it('falls back to witnessUtxo for bitcoinjs-style PSBTs', () => {
    const psbt: PsbtLike = {
      data: { inputs: [{ witnessUtxo: { script: otherScript } }, { witnessUtxo: { script: ownScript } }] }
    };
    expect(selectAccountInputs(psbt, account, NET)).toEqual([{ index: 1, publicKey: pubkey, sighashTypes: undefined }]);
  });
});

describe('formatUserToSignInputs (explicit toSignInputs)', () => {
  const psbt = opcatPsbt([{ script: ownScript }, { script: ownScript }]);

  it('forwards the page-supplied sighash whitelist unchanged', () => {
    const out = formatUserToSignInputs(psbt, [{ index: 0, publicKey: pubkey, sighashTypes: [0x82] }], account);
    expect(out).toEqual([{ index: 0, publicKey: pubkey, sighashTypes: [0x82] }]);
  });

  it('leaves the whitelist undefined when the page passes none', () => {
    const out = formatUserToSignInputs(psbt, [{ index: 1, address: account.address, sighashTypes: undefined }], account);
    expect(out[0].sighashTypes).toBeUndefined();
  });

  it('rejects non-numeric sighash types', () => {
    expect(() =>
      formatUserToSignInputs(psbt, [{ index: 0, publicKey: pubkey, sighashTypes: ['x' as unknown as number] }], account)
    ).toThrow('invalid sighash type');
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

describe('checkInputIndex', () => {
  it('coerces numeric strings and rejects null (which Number() would turn into 0)', () => {
    expect(checkInputIndex('1', 2)).toBe(1);
    expect(() => checkInputIndex(null, 2)).toThrow('invalid index');
  });
});

describe('sighash inspection', () => {
  it('resolves the effective type the way the OPCAT signer does', () => {
    expect(effectiveSighashType(undefined, undefined)).toBe(SIGHASH_ALL);
    expect(effectiveSighashType(undefined, [0x82, 0x01])).toBe(0x82);
    expect(effectiveSighashType(0x03, [0x82])).toBe(0x03);
  });

  it('recognises SIGHASH_NONE with and without ANYONECANPAY, and nothing else', () => {
    expect(isSighashNone(0x02)).toBe(true);
    expect(isSighashNone(0x82)).toBe(true);
    expect(isSighashNone(0x01)).toBe(false);
    expect(isSighashNone(0x03)).toBe(false);
    expect(isSighashNone(0x81)).toBe(false);
    expect(isSighashNone(0x83)).toBe(false);
  });

  it('finds inputs that would be signed with SIGHASH_NONE from either source', () => {
    const inputs = [{ sighashType: 0x02 }, { sighashType: undefined }, { sighashType: undefined }, { sighashType: 0x03 }];
    const toSign = [
      { index: 0, publicKey: pubkey }, // declared on the PSBT
      { index: 1, publicKey: pubkey, sighashTypes: [0x82] }, // page-supplied whitelist
      { index: 2, publicKey: pubkey, sighashTypes: [0x01] },
      { index: 3, publicKey: pubkey, sighashTypes: [0x02] } // declared SINGLE wins over the whitelist
    ];
    expect(findSighashNoneInputs(inputs, toSign)).toEqual([0, 1]);
    expect(findSighashNoneInputs(inputs, [{ index: 2, publicKey: pubkey }])).toEqual([]);
  });
});
