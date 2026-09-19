// Entry for the test dApp's "Generate" buttons. Bundled to psbt-builder.js by
// `npm run build:test-dapp`; the bundle is generated, not checked in.
//
// DummyProvider hands out fake UTXOs, so the PSBTs it builds can be signed and
// verified but never broadcast. That is enough to exercise the wallet's signing
// paths, which is all the manual test cases need.
import { DummyProvider, ExtPsbt } from '@opcat-labs/scrypt-ts-opcat';

const NETWORK = 'opcat-testnet';

window.psbtBuilder = {
  async generate(address, count = 1) {
    const utxos = await new DummyProvider(NETWORK).getUtxos(address);
    // Fee rate differs per entry so a batch is made of distinct PSBTs.
    return Array.from({ length: count }, (_, i) =>
      new ExtPsbt({ network: NETWORK }).spendUTXO(utxos).change(address, i + 1).seal().toHex()
    );
  }
};
