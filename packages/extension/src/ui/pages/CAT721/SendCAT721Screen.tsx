import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { CAT721CollectionInfo, TxType, UserToSignInput } from '@/shared/types';
import { Button, Column, Content, Header, Input, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { Loading } from '@/ui/components/ActionComponent/Loading';
import CAT721Preview from '@/ui/components/CAT721Preview';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { MergeBTCPopover } from '@/ui/components/MergeBTCPopover';
import { useI18n } from '@/ui/hooks/useI18n';
import { useNavigate } from '@/ui/pages/MainRoute';
import { isValidAddress, useWallet } from '@/ui/utils';
import { TestIds } from '@/ui/utils/test-ids';

import { SignPsbt } from '../Approval/components';

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
  const [inputAmount] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [toInfo, setToInfo] = useState<{
    address: string;
    domain: string;
  }>({
    address: '',
    domain: '',
  });

  const [error, setError] = useState('');

  const [showMergeBTCUTXOPopover, setShowMergeBTCUTXOPopover] = useState(false);
  const tools = useTools();

  const [feeRate, setFeeRate] = useState(5);

  useEffect(() => {
    setError('');
    setDisabled(true);

    if (!isValidAddress(toInfo.address)) {
      return;
    }

    setDisabled(false);
  }, [toInfo, inputAmount]);

  const transferData = useRef<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transferData: any;
    commitTx: string;
    commitToSignInputs: UserToSignInput[];
    revealTx: string;
    revealToSignInputs: UserToSignInput[];
  }>({
    transferData: null,
    commitTx: '',
    commitToSignInputs: [],
    revealTx: '',
    revealToSignInputs: []
  });
  const [step, setStep] = useState(0);
  const onConfirm = async () => {
    tools.showLoading(true);
    try {
      const step1 = await wallet.transferCAT721Step1(toInfo.address, collectionInfo.collectionId, localId, feeRate);
      if (step1) {
        transferData.current.transferData = step1.transferData;
        transferData.current.commitTx = step1.commitTx;
        transferData.current.commitToSignInputs = step1.toSignInputs;
        setStep(1);
      }
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (e as any).message;
      if (msg.includes('-307')) {
        setShowMergeBTCUTXOPopover(true);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((e as any).message);
    } finally {
      tools.showLoading(false);
    }
  };

  if (step == 1) {
    return (
      <SignPsbt
        header=<Header
          title={t('step_12')}
          onBack={() => {
            setStep(0);
          }}
        />
        params={{
          data: {
            psbtHex: transferData.current.commitTx,
            type: TxType.SIGN_TX,
            options: { autoFinalized: false, toSignInputs: transferData.current.commitToSignInputs }
          }
        }}
        handleCancel={() => {
          setStep(0);
        }}
        handleConfirm={async () => {
          try {
            tools.showLoading(true);
            const step2 = await wallet.transferCAT721Step2(
              transferData.current.transferData,
              transferData.current.commitTx,
              transferData.current.commitToSignInputs
            );

            transferData.current.revealTx = step2.revealTx;
            transferData.current.revealToSignInputs = step2.toSignInputs;
            transferData.current.transferData = step2.transferData;

            setStep(1.5);
            setTimeout(() => {
              setStep(2);
            }, 100);
          } catch (e) {
            console.log(e);
          } finally {
            tools.showLoading(false);
          }
        }}
      />
    );
  } else if (step == 1.5) {
    return <Loading />;
  } else if (step == 2) {
    return (
      <SignPsbt
        header=<Header
          title={t('step_22')}
          onBack={() => {
            setStep(0);
          }}
        />
        params={{
          data: {
            psbtHex: transferData.current.revealTx,
            type: TxType.SIGN_TX,
            options: { autoFinalized: false, toSignInputs: transferData.current.revealToSignInputs }
          }
        }}
        handleCancel={() => {
          setStep(0);
        }}
        handleConfirm={async () => {
          tools.showLoading(true);
          try {
            const step3 = await wallet.transferCAT721Step3(
              transferData.current.transferData,
              transferData.current.revealTx,
              transferData.current.revealToSignInputs
            );
            navigate('TxSuccessScreen', { txid: step3.txid });
          } catch (e) {
            // tools.toastError((e as any).message);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            navigate('TxFailScreen', { error: (e as any).message });
          } finally {
            tools.showLoading(false);
          }
        }}
      />
    );
  }

  return (
    <Layout testid={TestIds.CAT721.SEND_SCREEN}>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}
        title={t('send_cat721')}
      />
      <Content>
        <Text text={collectionInfo.name} preset="title-bold" textCenter size="xxl" color="gold" />

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

        <Column mt="lg">
          <Text text={t('fee')} color="textDim" />

          <FeeRateBar
            onChange={(val) => {
              setFeeRate(val);
            }}
          />
        </Column>

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
