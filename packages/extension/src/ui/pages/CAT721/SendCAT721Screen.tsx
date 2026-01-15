import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { EVENTS } from '@/shared/constant';
import eventBus from '@/shared/eventBus';
import { CAT721CollectionInfo, TxType } from '@/shared/types';
import { Button, Card, Column, Content, Footer, Header, Icon, Input, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import CAT721Preview from '@/ui/components/CAT721Preview';
import { MergeBTCPopover } from '@/ui/components/MergeBTCPopover';
import { useI18n } from '@/ui/hooks/useI18n';
import { useNavigate } from '@/ui/pages/MainRoute';
import { usePushBitcoinTxCallback } from '@/ui/state/transactions/hooks';
import { colors } from '@/ui/theme/colors';
import { isValidAddress, shortAddress, useFeeRate, useWallet } from '@/ui/utils';
import { TestIds } from '@/ui/utils/test-ids';
import { Transaction } from '@opcat-labs/scrypt-ts-opcat';

import { SignPsbt } from '../Approval/components';

// Step enum for clearer state management
enum Step {
  INPUT = 0,
  PREPARING = 1,
  CONFIRM = 2,
  VIEW_TX_DETAIL = 3
}

export default function SendCAT721Screen() {
  const { state } = useLocation();
  const props = state as {
    collectionInfo: CAT721CollectionInfo;
    localId: string;
  };

  const collectionInfo = props.collectionInfo;
  const localId = props.localId;

  const wallet = useWallet();
  const { t } = useI18n();
  const navigate = useNavigate();
  const tools = useTools();
  const pushBitcoinTx = usePushBitcoinTxCallback();

  // Input form state
  const [disabled, setDisabled] = useState(false);
  const [toInfo, setToInfo] = useState<{ address: string; domain: string }>({
    address: '',
    domain: ''
  });
  const feeRate = useFeeRate()
  const [error, setError] = useState('');
  const [showMergeBTCUTXOPopover, setShowMergeBTCUTXOPopover] = useState(false);

  // Transfer state
  const [step, setStep] = useState<Step>(Step.INPUT);
  const [preparingProgress, setPreparingProgress] = useState(0);
  const [preparingMessage, setPreparingMessage] = useState('');
  const [viewingTxIndex, setViewingTxIndex] = useState(-1);

  // Store signed transaction data
  const transferData = useRef<{
    allTxHexs: string[];
    allPsbtHexs: string[];
    receiver: string;
    networkFee: string;
  }>({
    allTxHexs: [],
    allPsbtHexs: [],
    receiver: '',
    networkFee: '0'
  });

  // Listen for progress updates from background
  useEffect(() => {
    const handleProgress = (data: { progress: number; message: string }) => {
      setPreparingProgress(data.progress);
      setPreparingMessage(data.message);
    };

    eventBus.addEventListener(EVENTS.transferCAT721Progress, handleProgress);

    return () => {
      eventBus.removeEventListener(EVENTS.transferCAT721Progress, handleProgress);
    };
  }, []);

  // Validate input
  useEffect(() => {
    setError('');
    setDisabled(true);

    if (!isValidAddress(toInfo.address)) {
      return;
    }

    setDisabled(false);
  }, [toInfo]);

  // Handle confirm - start preparing transactions
  const onConfirm = async () => {
    setStep(Step.PREPARING);
    setPreparingProgress(0);
    setPreparingMessage('Preparing transfer data...');

    try {
      const result = await wallet.transferCAT721(toInfo.address, collectionInfo.collectionId, localId, feeRate);

      setPreparingProgress(100);
      setPreparingMessage('Complete!');

      if (result) {
        transferData.current = {
          allTxHexs: [result.guardTxHex, result.sendTxHex],
          allPsbtHexs: [result.guardPsbtHex, result.sendPsbtHex],
          receiver: toInfo.address,
          networkFee: (Number(result.networkFee) / 1e8).toFixed(8)
        };

        setTimeout(() => {
          setStep(Step.CONFIRM);
        }, 300);
      }
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (e as any).message;
      if (msg.includes('-307')) {
        setShowMergeBTCUTXOPopover(true);
        setStep(Step.INPUT);
        return;
      }
      setError(msg);
      setStep(Step.INPUT);
    }
  };

  // Handle sign and broadcast
  const onSign = async () => {
    tools.showLoading(true);
    try {
      let lastTxid = '';
      for (const txHex of transferData.current.allTxHexs) {
        const result = await pushBitcoinTx(txHex);
        if (!result.success) {
          throw new Error(result.error || 'Failed to broadcast transaction');
        }
        lastTxid = result.txid || '';
      }
      navigate('TxSuccessScreen', { txid: lastTxid });
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate('TxFailScreen', { error: (e as any).message });
    } finally {
      tools.showLoading(false);
    }
  };

  // Preparing page with progress
  if (step === Step.PREPARING) {
    return (
      <Layout>
        <Content style={{ justifyContent: 'center', alignItems: 'center' }}>
          <Column style={{ alignItems: 'center', gap: 20 }}>
            <Text text={preparingMessage || 'Preparing...'} textCenter />
            <Text text={`${preparingProgress}%`} preset="bold" size="lg" textCenter />
            <Row style={{ width: 200, height: 4, backgroundColor: colors.border, borderRadius: 2 }}>
              <Row
                style={{
                  width: `${preparingProgress}%`,
                  height: '100%',
                  backgroundColor: colors.primary,
                  borderRadius: 2
                }}
              />
            </Row>
          </Column>
        </Content>
      </Layout>
    );
  }

  // View transaction detail (view only, no buttons)
  if (step === Step.VIEW_TX_DETAIL && viewingTxIndex >= 0) {
    return (
      <SignPsbt
        header={
          <Header
            title={`Transaction ${viewingTxIndex + 1}`}
            onBack={() => {
              setViewingTxIndex(-1);
              setStep(Step.CONFIRM);
            }}
          />
        }
        params={{
          data: {
            psbtHex: transferData.current.allPsbtHexs[viewingTxIndex],
            type: TxType.SIGN_TX,
            options: { autoFinalized: true }
          }
        }}
        viewOnly={true}
      />
    );
  }

  // Confirmation page with Related Txns
  if (step === Step.CONFIRM) {
    const txCount = transferData.current.allPsbtHexs.length;

    return (
      <Layout>
        <Header
          title={t('send_cat721')}
          onBack={() => {
            setStep(Step.INPUT);
          }}
        />
        <Content>
          {/* NFT info */}
          <Card style={{ backgroundColor: colors.bg4, borderRadius: 10 }}>
            <Column style={{ alignItems: 'center' }}>
              <CAT721Preview
                preset="medium"
                collectionId={collectionInfo.collectionId}
                contentType={collectionInfo.contentType}
                localId={localId}
              />
              <Text text={collectionInfo.name} preset="bold" style={{ marginTop: 8 }} />
              <Text text={`#${localId}`} color="textDim" size="sm" />
            </Column>
          </Card>

          {/* Receiver */}
          <Column mt="lg">
            <Text text="Receiver:" color="textDim" />
            <Card style={{ backgroundColor: colors.bg4, borderRadius: 10 }}>
              <Text text={transferData.current.receiver} wrap style={{ wordBreak: 'break-all' }} />
            </Card>
          </Column>

          {/* Network Fee */}
          <Column mt="lg">
            <Text text="Network Fee:" color="textDim" />
            <Card style={{ backgroundColor: colors.bg4, borderRadius: 10 }}>
              <Row justifyBetween itemsCenter full>
                <Text text={transferData.current.networkFee} />
                <Text text="BTC" color="textDim" />
              </Row>
            </Card>
          </Column>

          {/* Related Txns */}
          <Column mt="lg">
            <Text text={`Related Txns: (${txCount})`} color="textDim" />
            <Column gap="sm">
              {transferData.current.allTxHexs.map((txHex, index) => (
                <Card
                  key={index}
                  style={{ backgroundColor: colors.bg4, borderRadius: 10, cursor: 'pointer' }}
                  onClick={() => {
                    setViewingTxIndex(index);
                    setStep(Step.VIEW_TX_DETAIL);
                  }}>
                  <Row justifyBetween itemsCenter full>
                    <Text text={`(${index + 1}) ${shortAddress(new Transaction(txHex).id, 10)}`} />
                    <Icon icon="eye" size={16} color="textDim" />
                  </Row>
                </Card>
              ))}
            </Column>
          </Column>
        </Content>

        <Footer>
          <Row full gap="lg">
            <Button
              preset="default"
              text={t('reject')}
              onClick={() => {
                setStep(Step.INPUT);
              }}
              full
            />
            <Button preset="primary" text={t('sign')} onClick={onSign} full testid={TestIds.SEND.SIGN_AND_PAY_BUTTON} />
          </Row>
        </Footer>
      </Layout>
    );
  }

  // Input page
  return (
    <Layout testid={TestIds.CAT721.SEND_SCREEN}>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}
        title={t('send_cat721')}
      />
      <Content>
        <Text text={collectionInfo.name} preset="title-bold" textCenter size="xxl" color="primary" />

        <Row justifyCenter>
          <CAT721Preview
            preset="medium"
            collectionId={collectionInfo.collectionId}
            contentType={collectionInfo.contentType}
            localId={localId}
          />
        </Row>

        <Column mt="lg">
          <Input
            preset="address"
            addressInputData={toInfo}
            onAddressInputChange={(val) => {
              setToInfo(val);
            }}
            autoFocus={true}
            recipientLabel={<Text text={t('recipient')} preset="regular" color="textDim" />}
            testid={TestIds.CAT721.SEND_RECIPIENT_INPUT}
          />
        </Column>

        
        <Row mt="lg" justifyBetween>
          <Text text={t('fee')} color="textDim" />
          <Text text={`${feeRate} sats/byte`} />
        </Row>

        {error && <Text text={error} color="error" />}

        <Button
          disabled={disabled}
          preset="primary"
          text={t('next')}
          testid={TestIds.CAT721.SEND_NEXT_BUTTON}
          onClick={() => {
            onConfirm();
          }}></Button>

        {showMergeBTCUTXOPopover && (
          <MergeBTCPopover
            onClose={() => {
              setShowMergeBTCUTXOPopover(false);
            }}
          />
        )}
      </Content>
    </Layout>
  );
}
