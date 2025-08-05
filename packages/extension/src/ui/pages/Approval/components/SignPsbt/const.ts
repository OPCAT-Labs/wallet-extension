import { TxInfo } from './types';

export const initTxInfo: TxInfo = {
  changedBalance: 0,
  rawtx: '',
  psbtHex: '',
  toSignInputs: [],
  txError: '',
  decodedPsbt: {
    inputInfos: [],
    outputInfos: [],
    fee: 0,
    feeRate: 0,
    risks: [],
    features: {
      rbf: false
    },
    isScammer: false,
    shouldWarnFeeRate: false,
    recommendedFeeRate: 1
  },
  contractResults: []
};
