import { useCallback } from 'react';

import { KEYRING_TYPE } from '@/shared/constant';
import { TxType } from '@/shared/types';

export const usePsbtInitializer = (setTxInfo, setLoading, tools) => {
  const initializePsbt = useCallback(
    async ({
      type,
      psbtHex,
      options,
      sendBitcoinParams,
      session,
      currentAccount,
      wallet,
      prepareSendBTC,
    }) => {
      let txError = '';
      let finalPsbtHex = psbtHex;

      // handle PSBT based on transaction type
      try {
        if (type === TxType.SIGN_TX) {
          if (psbtHex && currentAccount.type === KEYRING_TYPE.KeystoneKeyring) {
            const toSignInputs = await wallet.formatOptionsToSignInputs(psbtHex, options);
            finalPsbtHex = await wallet.signPsbtWithHex(psbtHex, toSignInputs, false);
          }
        } else if (type === TxType.SEND_BITCOIN && sendBitcoinParams) {
          if (!psbtHex) {
            const rawTxInfo = await prepareSendBTC({
              toAddressInfo: { address: sendBitcoinParams.toAddress, domain: '' },
              toAmount: sendBitcoinParams.satoshis,
              feeRate: sendBitcoinParams.feeRate,
              enableRBF: false,
              memo: sendBitcoinParams.memo,
              memos: sendBitcoinParams.memos,
              disableAutoAdjust: true
            });
            finalPsbtHex = rawTxInfo.psbtHex;
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        txError = e.message;
        tools.toastError(txError);
      }

      // return error status if no PSBT
      if (!finalPsbtHex) {
        setLoading(false);
        setTxInfo((prev) => ({ ...prev, txError }));
        return;
      }

      // continue processing decoded PSBT and preparing signature inputs
      try {
        const decodedPsbt = await wallet.decodePsbt(finalPsbtHex, session?.origin || '');

        let toSignInputs = [];
        if (
          [TxType.SEND_BITCOIN,].includes(type)
        ) {
          toSignInputs = decodedPsbt.inputInfos.map((v, index) => ({
            index,
            publicKey: currentAccount.pubkey
          }));
        } else {
          toSignInputs = await wallet.formatOptionsToSignInputs(finalPsbtHex, options);
        }

        // handle contract information
        if (options && options.contracts) {
          try {
            const results = await wallet.decodeContracts(options?.contracts || [], {
              address: currentAccount.address,
              publicKey: currentAccount.pubkey
            });

            // update contract information to input and output with null checks
            decodedPsbt.inputInfos.forEach((v) => {
              if (!v) return;
              results.forEach((r) => {
                if (!r) return;
                if (v.address == r.address) v.contract = r;
              });
            });

            decodedPsbt.outputInfos.forEach((v) => {
              if (!v) return;
              results.forEach((r) => {
                if (!r) return;
                if (v.address == r.address) v.contract = r;
              });
            });
          } catch (e) {
            // ignore contract parsing error
          }
        }

        // update status
        setTxInfo({
          decodedPsbt,
          changedBalance: 0,
          changedInscriptions: [],
          psbtHex: finalPsbtHex,
          rawtx: '',
          toSignInputs,
          txError,
          contractResults: []
        });

        setLoading(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        setLoading(false);
        setTxInfo((prev) => ({ ...prev, txError: e.message }));
        tools.toastError(e.message);
      }
    },
    []
  );

  return { initializePsbt };
};
