import { AddressType, UnspentOutput } from '../../src';
import {
  BITCOIN_UTXO_DUST,
  ChainType,
  OPCAT_UTXO_DUST,
  getUtxoDustThreshold,
  resolveChainType
} from '../../src/constants';
import { NetworkType } from '../../src/network';
import { Transaction } from '../../src/transaction/transaction';
import { LocalWallet } from '../../src/wallet';
import { expect } from 'chai';

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
  chainType,
  sign = true
}: {
  fromWallet: LocalWallet;
  toWallet: LocalWallet;
  inputSatoshis: number;
  outputSatoshis: number;
  chainType?: ChainType;
  sign?: boolean;
}) {
  const tx = new Transaction();
  tx.setNetworkType(fromWallet.networkType);
  tx.setFeeRate(1);
  tx.setChangeAddress(fromWallet.address);
  if (chainType !== undefined) {
    tx.setChainType(chainType);
  }
  tx.addOutput(toWallet.address, outputSatoshis);

  const toSignInputs = await tx.addSufficientUtxosForFee([genDummyUtxo(fromWallet, inputSatoshis)]);
  const builderFee = inputSatoshis - outputSatoshis - tx.getChangeAmount();
  const psbt = tx.toPsbt();
  if (sign) {
    await fromWallet.signPsbt(psbt as any, { autoFinalized: true, toSignInputs: toSignInputs as any });
  }
  return {
    psbt,
    builderFee,
    changeAmount: tx.getChangeAmount(),
    fee: sign ? Number(psbt.getFee()) : builderFee
  };
}

async function buildTransactionWithFixedFee({
  fromWallet,
  toWallet,
  outputSatoshis,
  chainType,
  targetChange,
  networkFee = 200
}: {
  fromWallet: LocalWallet;
  toWallet: LocalWallet;
  outputSatoshis: number;
  chainType?: ChainType;
  targetChange: number;
  networkFee?: number;
}) {
  const tx = new Transaction();
  tx.setNetworkType(fromWallet.networkType);
  tx.setFeeRate(1);
  tx.setChangeAddress(fromWallet.address);
  if (chainType !== undefined) {
    tx.setChainType(chainType);
  }
  tx.addInput(genDummyUtxo(fromWallet, outputSatoshis + networkFee + targetChange));
  tx.addOutput(toWallet.address, outputSatoshis);
  tx.calNetworkFee = async () => networkFee;

  await tx.addSufficientUtxosForFee([]);
  return {
    psbt: tx.toPsbt(),
    changeAmount: tx.getChangeAmount()
  };
}

describe('Transaction dust policy', function () {
  const fromWallet = LocalWallet.fromRandom(AddressType.P2PKH, NetworkType.MAINNET);
  const toWallet = LocalWallet.fromRandom(AddressType.P2PKH, NetworkType.MAINNET);

  it('resolves dust thresholds from the selected chain policy', function () {
    expect(getUtxoDustThreshold()).eq(BITCOIN_UTXO_DUST);
    expect(getUtxoDustThreshold(ChainType.BITCOIN)).eq(BITCOIN_UTXO_DUST);
    expect(getUtxoDustThreshold(ChainType.OPCAT)).eq(OPCAT_UTXO_DUST);
  });

  it('prefers explicit chain policy over the legacy OPCAT flag', function () {
    expect(resolveChainType()).eq(ChainType.BITCOIN);
    expect(resolveChainType({ isOpcat: true })).eq(ChainType.OPCAT);
    expect(resolveChainType({ chainType: ChainType.OPCAT, isOpcat: false })).eq(ChainType.OPCAT);
    expect(resolveChainType({ chainType: ChainType.BITCOIN, isOpcat: true })).eq(ChainType.BITCOIN);
  });

  it('keeps OPCAT small positive change instead of sweeping it to fees', async function () {
    const inputSatoshis = 603;
    const outputSatoshis = 200;
    const ret = await buildTransaction({
      fromWallet,
      toWallet,
      inputSatoshis,
      outputSatoshis,
      chainType: ChainType.OPCAT
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

  it('keeps OPCAT change at the exact 1-sat threshold', async function () {
    const outputSatoshis = 200;
    const ret = await buildTransactionWithFixedFee({
      fromWallet,
      toWallet,
      outputSatoshis,
      chainType: ChainType.OPCAT,
      targetChange: OPCAT_UTXO_DUST
    });
    const changeOutput = ret.psbt.txOutputs[1];

    expect(ret.psbt.txOutputs.length).eq(2);
    expect(changeOutput.address).eq(fromWallet.address);
    expect(changeOutput.value).eq(OPCAT_UTXO_DUST);
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

  it('keeps Bitcoin change at the exact 546-sat threshold by default', async function () {
    const outputSatoshis = 200;
    const ret = await buildTransactionWithFixedFee({
      fromWallet,
      toWallet,
      outputSatoshis,
      targetChange: BITCOIN_UTXO_DUST
    });
    const changeOutput = ret.psbt.txOutputs[1];

    expect(ret.psbt.txOutputs.length).eq(2);
    expect(changeOutput.address).eq(fromWallet.address);
    expect(changeOutput.value).eq(BITCOIN_UTXO_DUST);
  });
});
