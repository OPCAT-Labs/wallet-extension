import { UTXO_DUST } from '../constants';
import { ErrorCodes, WalletUtilsError } from '../error';
import { NetworkType, toOpcatNetwork } from '../network';
import { Transaction } from '../transaction/transaction';
import { utxoHelper } from '../transaction/utxo';
import { ToSignInput, UnspentOutput } from '../types';

// import * as scryptOpCat from '@opcat-labs/scrypt-ts-opcat';
// const { ExtPsbt, intToByteString, len } = scryptOpCat;

import { ExtPsbt, intToByteString, len } from '@opcat-labs/scrypt-ts-opcat';

function hexifyMemos(memos: string[]) {
  return memos.map((memo) => {
    if (Buffer.from(memo, 'hex').toString('hex') === memo) {
      return memo;
    }
    return Buffer.from(memo).toString('hex');
  });
}

function sendOpcatBtc({
  btcUtxos,
  tos,
  networkType,
  changeAddress,
  feeRate,
  isOpcat,
  enableRBF = true,
  memo,
  memos
}: {
  btcUtxos: UnspentOutput[];
  tos: {
    address: string;
    satoshis: number;
  }[];
  networkType: NetworkType;
  changeAddress: string;
  feeRate: number;
  isOpcat?: boolean
  enableRBF?: boolean;
  memo?: string;
  memos?: string[];
}) {
  const memoArr = memo ? [memo] : memos;
  let memoStr = ''
  if (memoArr && memoArr.length > 0 && memoArr[0]) {
    let hexMemos = hexifyMemos(memoArr)
    hexMemos.forEach(hexMemo => {
      memoStr += intToByteString(len(hexMemo), BigInt(4)) + hexMemo
    })
  }

  const extPsbt = new ExtPsbt({network: toOpcatNetwork(networkType)})
    .spendUTXO(btcUtxos.map(v => ({
      txId: v.txid,
      outputIndex: v.vout,
      satoshis: v.satoshis,
      script: v.scriptPk,
      data: v.data || ''
    })))
  
  if (tos.length > 0) {
    extPsbt.addOutput({
      address: tos[0].address,
      value: BigInt(tos[0].satoshis),
      data: Buffer.from(memoStr, 'hex')
    })
  }
    
  tos.slice(1).forEach(v => {
    extPsbt.addOutput({
      address: v.address,
      value: BigInt(v.satoshis),
      data: Buffer.alloc(0)
    })
  })
  extPsbt.change(changeAddress, feeRate).seal()
  const signInputs = extPsbt.psbtOptions().toSignInputs;
  signInputs.forEach(v => {
    v.publicKey = btcUtxos[v.index].pubkey
  })
  return {psbt: extPsbt, toSignInputs: signInputs}
}

export async function sendBTC({
  btcUtxos,
  tos,
  networkType,
  changeAddress,
  feeRate,
  isOpcat,
  enableRBF = true,
  memo,
  memos
}: {
  btcUtxos: UnspentOutput[];
  tos: {
    address: string;
    satoshis: number;
  }[];
  networkType: NetworkType;
  changeAddress: string;
  feeRate: number;
  isOpcat?: boolean
  enableRBF?: boolean;
  memo?: string;
  memos?: string[];
}) {
  if (isOpcat) {
    return sendOpcatBtc({
      btcUtxos,
      tos,
      networkType,
      changeAddress,
      feeRate,
      isOpcat,
      enableRBF,
      memo,
      memos
    })
  }
  if (utxoHelper.hasAnyAssets(btcUtxos)) {
    throw new WalletUtilsError(ErrorCodes.NOT_SAFE_UTXOS);
  }

  const tx = new Transaction();
  tx.setNetworkType(networkType);
  tx.setFeeRate(feeRate);
  tx.setEnableRBF(enableRBF);
  tx.setChangeAddress(changeAddress);

  tos.forEach((v) => {
    tx.addOutput(v.address, v.satoshis);
  });

  if (memo) {
    if (Buffer.from(memo, 'hex').toString('hex') === memo) {
      tx.addOpreturn([Buffer.from(memo, 'hex')]);
    } else {
      tx.addOpreturn([Buffer.from(memo)]);
    }
  } else if (memos) {
    if (Buffer.from(memos[0], 'hex').toString('hex') === memos[0]) {
      tx.addOpreturn(memos.map((memo) => Buffer.from(memo, 'hex')));
    } else {
      tx.addOpreturn(memos.map((memo) => Buffer.from(memo)));
    }
  }

  const toSignInputs = await tx.addSufficientUtxosForFee(btcUtxos);

  const psbt = tx.toPsbt();

  return { psbt, toSignInputs };
}

export async function sendAllBTC({
  btcUtxos,
  toAddress,
  networkType,
  feeRate,
  isOpcat,
  enableRBF = true
}: {
  btcUtxos: UnspentOutput[];
  toAddress: string;
  networkType: NetworkType;
  feeRate: number;
  isOpcat?: boolean;
  enableRBF?: boolean;
}) {

  if (isOpcat) {
    return sendOpcatBtc({
      btcUtxos,
      tos: [],
      networkType,
      changeAddress: toAddress,
      feeRate,
      isOpcat,
      enableRBF
    })
  }

  if (utxoHelper.hasAnyAssets(btcUtxos)) {
    throw new WalletUtilsError(ErrorCodes.NOT_SAFE_UTXOS);
  }

  const tx = new Transaction();
  tx.setNetworkType(networkType);
  tx.setFeeRate(feeRate);
  tx.setEnableRBF(enableRBF);
  tx.addOutput(toAddress, UTXO_DUST);

  const toSignInputs: ToSignInput[] = [];
  btcUtxos.forEach((v, index) => {
    tx.addInput(v);
    toSignInputs.push({ index, publicKey: v.pubkey });
  });

  const fee = await tx.calNetworkFee();
  const unspent = tx.getTotalInput() - fee;
  if (unspent < UTXO_DUST) {
    throw new WalletUtilsError(ErrorCodes.INSUFFICIENT_BTC_UTXO);
  }
  tx.outputs[0].value = unspent;

  const psbt = tx.toPsbt();

  return { psbt, toSignInputs };
}
