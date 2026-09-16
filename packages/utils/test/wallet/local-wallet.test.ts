import { expect } from 'chai';
import { AddressType } from '../../src';
import { ECPair, bitcoin } from '../../src/bitcoin-core';
import { NetworkType, toPsbtNetwork } from '../../src/network';
import { LocalWallet } from '../../src/wallet';

const sampleMnemonic = 'finish oppose decorate face calm tragic certain desk hour urge dinosaur mango';

describe('local-wallet', () => {
  describe('new a wallet', function () {
    // Tests for removed address types (P2TR, P2WPKH) have been deleted
    // OpCat only supports P2PKH
  });

  describe('signPsbt sighash policy for auto-detected inputs', function () {
    const wallet = new LocalWallet(ECPair.makeRandom().toWIF(), AddressType.P2PKH, NetworkType.MAINNET);

    // A one-input PSBT spending the wallet's own P2PKH output, optionally declaring a sighash type.
    // The unsafe-nonsegwit flag mirrors what Transaction.toPsbt() sets for P2PKH inputs.
    function buildPsbt(sighashType?: number) {
      const psbt = new bitcoin.Psbt({ network: toPsbtNetwork(NetworkType.MAINNET) });
      psbt.addInput({
        hash: Buffer.alloc(32, 1),
        index: 0,
        witnessUtxo: { script: Buffer.from(wallet.scriptPk, 'hex'), value: 10000 },
        ...(sighashType !== undefined ? { sighashType } : {})
      });
      psbt.addOutput({ address: wallet.address, value: 9000 });
      (psbt as any).__CACHE.__UNSAFE_SIGN_NONSEGWIT = true;
      return psbt;
    }

    it('refuses an input that declares SIGHASH_NONE instead of signing with it', async () => {
      let err: Error | undefined;
      try {
        await wallet.signPsbt(buildPsbt(bitcoin.Transaction.SIGHASH_NONE), { autoFinalized: false });
      } catch (e) {
        err = e as Error;
      }
      expect(err).to.be.an('error');
      expect(err!.message).to.include('sighash type 2');
    });

    it('signs an undeclared input with SIGHASH_ALL', async () => {
      const psbt = await wallet.signPsbt(buildPsbt(), { autoFinalized: false });
      const sig = psbt.data.inputs[0].partialSig![0].signature;
      expect(sig[sig.length - 1]).to.eq(bitcoin.Transaction.SIGHASH_ALL);
    });
  });
});
