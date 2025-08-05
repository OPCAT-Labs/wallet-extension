import {
  ContractResult,
  DecodedPsbt,
  RawTxInfo,
  SignPsbtOptions,
  ToSignInput,
  TxType
} from '@/shared/types';

export interface Props {
  header?: React.ReactNode;
  params: {
    data: {
      type: TxType;

      psbtHex: string;
      options?: SignPsbtOptions;
      rawTxInfo?: RawTxInfo;

      sendBitcoinParams?: {
        toAddress: string;
        satoshis: number;
        memo: string;
        memos: string[];
        feeRate: number;
      };
    };
    session?: {
      origin: string;
      icon: string;
      name: string;
    };
  };
  handleCancel?: () => void;
  handleConfirm?: (rawTxInfo?: RawTxInfo) => void;
}

export interface InputInfo {
  txid: string;
  vout: number;
  address: string;
  value: number;
}

export interface OutputInfo {
  address: string;
  value: number;
}

export enum TabState {
  DETAILS,
  DATA,
  HEX
}

export interface TxInfo {
  changedBalance: number;
  rawtx: string;
  psbtHex: string;
  toSignInputs: ToSignInput[];
  txError: string;
  decodedPsbt: DecodedPsbt;
  contractResults: ContractResult[];
}
