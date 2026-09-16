import { useState } from 'react';

import { ChainType, TypeChain } from '@/shared/constant';
import { Row } from '@/ui/components';
import { Button } from '@/ui/components/Button';
import { useI18n } from '@/ui/hooks/useI18n';
import { BuyBTCModal } from '@/ui/pages/BuyBTC/BuyBTCModal';
import { useNavigate } from '@/ui/pages/MainRoute';
import { useAddressExplorerUrl, useChainType } from '@/ui/state/settings/hooks';
import { useResetUiTxCreateScreen } from '@/ui/state/ui/hooks';
import { TestIds } from '@/ui/utils/test-ids';

interface WalletActionsProps {
  chain: TypeChain;
  address: string;
}

export const WalletActions = ({ chain, address }: WalletActionsProps) => {
  const navigate = useNavigate();
  const resetUiTxCreateScreen = useResetUiTxCreateScreen();
  const chainType = useChainType();
  const addressExplorerUrl = useAddressExplorerUrl(address);
  const [buyBtcModalVisible, setBuyBtcModalVisible] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <Row justifyCenter mt="md">
        <Button
          text={t('receive')}
          preset="home"
          icon="receive"
          testid={TestIds.WALLET.RECEIVE_BUTTON}
          onClick={() => {
            navigate('ReceiveScreen');
          }}
        />

        <Button
          text={t('send')}
          preset="home"
          icon="send"
          testid={TestIds.WALLET.SEND_BUTTON}
          onClick={() => {
            resetUiTxCreateScreen();
            navigate('TxCreateScreen');
          }}
        />
        <Button
          text={t('history')}
          preset="home"
          icon="history"
          onClick={() => {
            if (chain.isViewTxHistoryInternally) {
              navigate('HistoryScreen');
            } else {
              window.open(addressExplorerUrl);
            }
          }}
        />
        <Button
          text={t('buy')}
          preset="home"
          icon={'bitcoin'}
          iconSize={undefined}
          onClick={() => {
            setBuyBtcModalVisible(true);
          }}
          disabled={chainType !== ChainType.OPCAT_MAINNET}
        />
      </Row>

      {buyBtcModalVisible && (
        <BuyBTCModal
          onClose={() => {
            setBuyBtcModalVisible(false);
          }}
        />
      )}
    </>
  );
};
