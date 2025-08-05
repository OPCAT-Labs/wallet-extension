import { createSlice } from '@reduxjs/toolkit';

import { updateVersion } from '../global/actions';

export interface UIState {
  assetTabKey: AssetTabKey;
  catAssetTabKey: CATAssetTabKey;
  uiTxCreateScreen: {
    toInfo: {
      address: string;
      domain: string;
    };
    inputAmount: string;
    enableRBF: boolean;
    feeRate: number;
  };
  navigationSource: NavigationSource;
  isBalanceHidden: boolean;
}

export enum AssetTabKey {
  CAT,
}

export enum CATAssetTabKey {
  CAT20,
  CAT721
}

export enum NavigationSource {
  BACK,
  NORMAL
}

export const initialState: UIState = {
  assetTabKey: AssetTabKey.CAT,
  catAssetTabKey: CATAssetTabKey.CAT20,
  uiTxCreateScreen: {
    toInfo: {
      address: '',
      domain: '',
    },
    inputAmount: '',
    enableRBF: false,
    feeRate: 1
  },
  navigationSource: NavigationSource.NORMAL,
  isBalanceHidden: false
};

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    reset(_state) {
      return initialState;
    },
    updateAssetTabScreen(
      state,
      action: {
        payload: {
          assetTabKey?: AssetTabKey;
          catAssetTabKey?: CATAssetTabKey;
        };
      }
    ) {
      const { payload } = action;
      if (payload.assetTabKey !== undefined) {
        state.assetTabKey = payload.assetTabKey;
      }
      if (payload.catAssetTabKey !== undefined) {
        state.catAssetTabKey = payload.catAssetTabKey;
      }
      return state;
    },
    updateTxCreateScreen(
      state,
      action: {
        payload: {
          toInfo?: {
            address: string;
            domain: string;
          };
          inputAmount?: string;
          enableRBF?: boolean;
          feeRate?: number;
        };
      }
    ) {
      if (action.payload.toInfo !== undefined) {
        state.uiTxCreateScreen.toInfo = action.payload.toInfo;
      }
      if (action.payload.inputAmount !== undefined) {
        state.uiTxCreateScreen.inputAmount = action.payload.inputAmount;
      }
      if (action.payload.enableRBF !== undefined) {
        state.uiTxCreateScreen.enableRBF = action.payload.enableRBF;
      }
      if (action.payload.feeRate !== undefined) {
        state.uiTxCreateScreen.feeRate = action.payload.feeRate;
      }
    },
    resetTxCreateScreen(state) {
      state.uiTxCreateScreen = initialState.uiTxCreateScreen;
    },
    setNavigationSource(state, action: { payload: NavigationSource }) {
      state.navigationSource = action.payload;
    },
    setBalanceHidden(state, action: { payload: boolean }) {
      state.isBalanceHidden = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(updateVersion, (state) => {
      // todo
      if (!state.assetTabKey) {
        state.assetTabKey = AssetTabKey.CAT;
      }
      if (!state.catAssetTabKey) {
        state.catAssetTabKey = CATAssetTabKey.CAT20;
      }
      if (!state.uiTxCreateScreen) {
        state.uiTxCreateScreen = initialState.uiTxCreateScreen;
      }
      if (state.isBalanceHidden === undefined) {
        state.isBalanceHidden = false;
      }
    });
  }
});

export const uiActions = slice.actions;
export default slice.reducer;
