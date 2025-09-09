import { expect } from 'chai';
import { sendAllBTC, sendBTC } from '../../src/tx-helpers';
import { AddressType, UnspentOutput } from '../../src/types';
import { LocalWallet } from '../../src/wallet';
import { printPsbt } from '../utils';

let dummyUtxoIndex = 0;

/**
 * generate dummy utxos
 */
export function genDummyUtxos(
  wallet: LocalWallet,
  satoshisArray: number[],
  assetsArray?: {
  }[]
) {
  return satoshisArray.map((v, index) =>
    genDummyUtxo(wallet, satoshisArray[index], assetsArray ? assetsArray[index] : undefined)
  );
}

/**
 * generate a dummy utxo
 */
export function genDummyUtxo(
  wallet: LocalWallet,
  satoshis: number,
  assets?: {
  },
  txid?: string,
  vout?: number
): UnspentOutput {
  return {
    txid: txid || '0000000000000000000000000000000000000000000000000000000000000000',
    vout: vout !== undefined ? vout : dummyUtxoIndex++,
    satoshis: satoshis,
    scriptPk: wallet.scriptPk,
    addressType: wallet.addressType,
    pubkey: wallet.pubkey,
  };
}

/**
 * For P2PKH, the signature length is not fixed, so we need to handle it specially
 */
export function expectFeeRate(addressType: AddressType, feeRateA: number, feeRateB: number) {
  if (addressType === AddressType.P2PKH) {
    expect(feeRateA).lt(feeRateB * 1.01);
    expect(feeRateA).gt(feeRateB * 0.99);
  } else {
    expect(feeRateA).eq(feeRateB);
  }
}

/**
 * create a dummy send btc psbt for test
 */
export async function dummySendBTC({
  wallet,
  btcUtxos,
  tos,
  feeRate,
  dump,
  enableRBF,
  memo,
  memos
}: {
  wallet: LocalWallet;
  btcUtxos: UnspentOutput[];
  tos: { address: string; satoshis: number }[];
  feeRate: number;
  dump?: boolean;
  enableRBF?: boolean;
  memo?: string;
  memos?: string[];
}) {
  const { psbt, toSignInputs } = await sendBTC({
    btcUtxos,
    tos,
    networkType: wallet.networkType,
    changeAddress: wallet.address,
    feeRate,
    enableRBF,
    memo,
    memos
  });

  await wallet.signPsbt(psbt as any, { autoFinalized: true, toSignInputs: toSignInputs as any});
  const tx = psbt.extractTransaction(true);
  const txid = tx.getId();
  const inputCount = psbt.txInputs.length;
  const outputCount = psbt.txOutputs.length;
  const fee = psbt.getFee();
  const virtualSize = tx.virtualSize();
  const finalFeeRate = parseFloat((Number(fee) / virtualSize).toFixed(1));
  if (dump) {
    printPsbt(psbt as any);
  }
  return { psbt, txid, inputCount, outputCount, feeRate: finalFeeRate };
}

/**
 * create a dummy send all btc psbt for test
 */
export async function dummySendAllBTC({
  wallet,
  btcUtxos,
  toAddress,
  feeRate,
  dump,
  enableRBF
}: {
  wallet: LocalWallet;
  btcUtxos: UnspentOutput[];
  toAddress: string;
  feeRate: number;
  dump?: boolean;
  enableRBF?: boolean;
}) {
  const { psbt, toSignInputs } = await sendAllBTC({
    btcUtxos,
    toAddress,
    feeRate,
    enableRBF,
    networkType: wallet.networkType
  });
  await wallet.signPsbt(psbt as any, { autoFinalized: true, toSignInputs: toSignInputs as any});

  const inputCount = psbt.txInputs.length;
  const outputCount = psbt.txOutputs.length;
  if (dump) {
    printPsbt(psbt as any);
  }

  const fee = psbt.getFee();
  const tx = psbt.extractTransaction(true);
  const virtualSize = tx.virtualSize();
  const txid = tx.getId();
  const finalFeeRate = parseFloat((Number(fee) / virtualSize).toFixed(1));
  return { psbt, txid, inputCount, outputCount, feeRate: finalFeeRate };
}
