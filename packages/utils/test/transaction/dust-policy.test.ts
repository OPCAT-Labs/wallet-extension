import { expect } from 'chai';
import { AddressType, UnspentOutput } from '../../src';
import { BITCOIN_UTXO_DUST, OPCAT_UTXO_DUST } from '../../src/constants';
import { NetworkType } from '../../src/network';
import { Transaction } from '../../src/transaction/transaction';
import { LocalWallet } from '../../src/wallet';

function genDummyUtxo(wallet: LocalWallet, satoshis: number): UnspentOutput {
  return {
    txid: '0000000000000000000000000000000000000000000000000000000000000000',
    vout: 0,
    satoshis,
    scriptPk: wallet.scriptPk,
    addressType: wallet.addressType,
    pubkey: wallet.pubkey
  };
}

async function buildTransaction({
  fromWallet,
  toWallet,
  inputSatoshis,
  outputSatoshis,
  dustThreshold
}: {
  fromWallet: LocalWallet;
  toWallet: LocalWallet;
  inputSatoshis: number;
  outputSatoshis: number;
  dustThreshold?: number;
}) {
  const tx = new Transaction();
  tx.setNetworkType(fromWallet.networkType);
  tx.setFeeRate(1);
  tx.setChangeAddress(fromWallet.address);
  if (dustThreshold !== undefined) {
    tx.setDustThreshold(dustThreshold);
  }
  tx.addOutput(toWallet.address, outputSatoshis);

  const toSignInputs = await tx.addSufficientUtxosForFee([genDummyUtxo(fromWallet, inputSatoshis)]);
  const psbt = tx.toPsbt();
  await fromWallet.signPsbt(psbt as any, { autoFinalized: true, toSignInputs: toSignInputs as any });
  return {
    psbt,
    fee: Number(psbt.getFee())
  };
}

describe('Transaction dust policy', function () {
  const fromWallet = LocalWallet.fromRandom(AddressType.P2PKH, NetworkType.MAINNET);
  const toWallet = LocalWallet.fromRandom(AddressType.P2PKH, NetworkType.MAINNET);

  it('keeps OPCAT small positive change instead of sweeping it to fees', async function () {
    const inputSatoshis = 603;
    const outputSatoshis = 200;
    const ret = await buildTransaction({
      fromWallet,
      toWallet,
      inputSatoshis,
      outputSatoshis,
      dustThreshold: OPCAT_UTXO_DUST
    });
    const changeOutput = ret.psbt.txOutputs[1];

    expect(ret.psbt.txInputs.length).eq(1);
    expect(ret.psbt.txOutputs.length).eq(2);
    expect(ret.psbt.txOutputs[0].value).eq(outputSatoshis);
    expect(changeOutput.address).eq(fromWallet.address);
    expect(changeOutput.value).eq(inputSatoshis - outputSatoshis - ret.fee);
    expect(changeOutput.value).gt(0);
    expect(changeOutput.value).lt(BITCOIN_UTXO_DUST);
  });

  it('uses the Bitcoin dust threshold by default', async function () {
    const inputSatoshis = 603;
    const outputSatoshis = 200;
    const ret = await buildTransaction({
      fromWallet,
      toWallet,
      inputSatoshis,
      outputSatoshis
    });
    const remainingAfterFee = inputSatoshis - outputSatoshis - ret.fee;

    expect(ret.psbt.txInputs.length).eq(1);
    expect(ret.psbt.txOutputs.length).eq(1);
    expect(ret.psbt.txOutputs[0].value).eq(outputSatoshis);
    expect(remainingAfterFee).lt(BITCOIN_UTXO_DUST);
  });
});
