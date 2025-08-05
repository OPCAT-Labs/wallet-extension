import { createSlice } from '@reduxjs/toolkit';
import { UTXO } from '@/shared/types';

import { updateVersion } from '../global/actions';

export interface BitcoinTx {
  fromAddress: string;
  toAddress: string;
  toSatoshis: number;
  rawtx: string;
  txid: string;
  fee: number;
  estimateFee: number;
  changeSatoshis: number;
  sending: boolean;
  autoAdjust: boolean;
  psbtHex: string;
  feeRate: number;
  toDomain: string;
  enableRBF: boolean;
}

export interface TransactionsState {
  bitcoinTx: BitcoinTx;
  utxos: UTXO[];
  spendUnavailableUtxos: UTXO[];
}

export const initialState: TransactionsState = {
  bitcoinTx: {
    fromAddress: '',
    toAddress: '',
    toSatoshis: 0,
    rawtx: '',
    txid: '',
    fee: 0,
    estimateFee: 0,
    changeSatoshis: 0,
    sending: false,
    autoAdjust: false,
    psbtHex: '',
    feeRate: 5,
    toDomain: '',
    enableRBF: false
  },
  utxos: [],
  spendUnavailableUtxos: [],
};

const slice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    updateBitcoinTx(
      state,
      action: {
        payload: {
          fromAddress?: string;
          toAddress?: string;
          toSatoshis?: number;
          changeSatoshis?: number;
          rawtx?: string;
          txid?: string;
          fee?: number;
          estimateFee?: number;
          sending?: boolean;
          autoAdjust?: boolean;
          psbtHex?: string;
          feeRate?: number;
          toDomain?: string;
          enableRBF?: boolean;
        };
      }
    ) {
      const { payload } = action;
      state.bitcoinTx = Object.assign({}, state.bitcoinTx, payload);
    },
    setUtxos(state, action: { payload: UTXO[] }) {
      state.utxos = action.payload;
    },
    setSpendUnavailableUtxos(state, action: { payload: UTXO[] }) {
      state.spendUnavailableUtxos = action.payload;
    },
    reset(_state) {
      return initialState;
    }
  },

  extraReducers: (builder) => {
    builder.addCase(updateVersion, (state) => {
      if (!state.spendUnavailableUtxos) {
        state.spendUnavailableUtxos = [];
      }
    });
  }
});

export const transactionsActions = slice.actions;
export default slice.reducer;
