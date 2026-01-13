import BigNumber from 'bignumber.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { EVENTS } from '@/shared/constant';
import eventBus from '@/shared/eventBus';
import { runesUtils } from '@/shared/lib/runes-utils';
import {
  AddressCAT20UtxoSummary,
  CAT20Balance,
  CAT20TokenInfo,
  TxType
} from '@/shared/types';
import { Button, Card, Column, Content, Footer, Header, Icon, Input, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { BRC20Ticker } from '@/ui/components/BRC20Ticker';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { MergeBTCPopover } from '@/ui/components/MergeBTCPopover';
import { TickUsdWithoutPrice, TokenType } from '@/ui/components/TickUsd';
import { useI18n } from '@/ui/hooks/useI18n';
import { useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { usePushBitcoinTxCallback } from '@/ui/state/transactions/hooks';
import { colors } from '@/ui/theme/colors';
import { isValidAddress, shortAddress, showLongNumber, useFeeRate, useWallet } from '@/ui/utils';
import { TestIds } from '@/ui/utils/test-ids';
import {Transaction} from '@opcat-labs/scrypt-ts-opcat'

import { SignPsbt } from '../Approval/components';

const MAX_TOKEN_INPUT = 4;

// Step enum for clearer state management
enum Step {
  INPUT = 0,
  PREPARING = 1,
  CONFIRM = 2,
  VIEW_TX_DETAIL = 3
}

export default function SendCAT20Screen() {
  const { state } = useLocation();
  const props = state as {
    cat20Balance: CAT20Balance;
    cat20Info: CAT20TokenInfo;
  };

  const cat20Balance = props.cat20Balance;
  const cat20Info = props.cat20Info;

  const wallet = useWallet();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tools = useTools();
  const account = useCurrentAccount();
  const pushBitcoinTx = usePushBitcoinTxCallback();

  // Input form state
  const [inputAmount, setInputAmount] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [toInfo, setToInfo] = useState<{ address: string; domain: string }>({
    address: '',
    domain: ''
  });
  const feeRate = useFeeRate()
  const [error, setError] = useState('');
  const [showMergeBTCUTXOPopover, setShowMergeBTCUTXOPopover] = useState(false);

  // Token UTXO summary
  const [tokenUtxoSummary, setTokenUtxoSummary] = useState<AddressCAT20UtxoSummary>({
    totalUtxoCount: 0,
    availableUtxoCount: 0,
    availableTokenAmounts: []
  });

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
    amount: string;
    networkFee: string;
  }>({
    allTxHexs: [],
    allPsbtHexs: [],
    receiver: '',
    amount: '',
    networkFee: '0'
  });

  // Load token UTXO summary
  useEffect(() => {
    tools.showLoading(true);
    wallet
      .getAddressCAT20UtxoSummary(account.address, cat20Balance.tokenId)
      .then((data) => {
        setTokenUtxoSummary(data);
      })
      .finally(() => {
        tools.showLoading(false);
      });
  }, []);

  // Calculate available token amount
  const availableTokenAmount = cat20Balance.amount

  const shouldShowMerge = availableTokenAmount !== cat20Balance.amount;

  // Listen for progress updates from background
  useEffect(() => {
    const handleProgress = (data: { progress: number; message: string }) => {
      setPreparingProgress(data.progress);
      setPreparingMessage(data.message);
    };

    eventBus.addEventListener(EVENTS.transferCAT20Progress, handleProgress);

    return () => {
      eventBus.removeEventListener(EVENTS.transferCAT20Progress, handleProgress);
    };
  }, []);

  // Validate input
  useEffect(() => {
    setError('');
    setDisabled(true);

    if (!isValidAddress(toInfo.address)) {
      return;
    }
    if (!inputAmount) {
      return;
    }

    const amt = runesUtils.fromDecimalAmount(inputAmount, cat20Balance.decimals);
    if (runesUtils.compareAmount(amt, '0') != 1) {
      return;
    }

    if (runesUtils.compareAmount(amt, availableTokenAmount) == 1) {
      return;
    }

    setDisabled(false);
  }, [toInfo, inputAmount]);

  // Handle confirm - start preparing transactions
  const onConfirm = async () => {
    setStep(Step.PREPARING);
    setPreparingProgress(0);
    setPreparingMessage('Preparing transfer data...');

    try {
      const cat20Amount = runesUtils.fromDecimalAmount(inputAmount, cat20Balance.decimals);
      const result = await wallet.transferCAT20(toInfo.address, cat20Balance.tokenId, cat20Amount, feeRate);

      setPreparingProgress(100);
      setPreparingMessage('Complete!');

      if (result) {
        transferData.current = {
          allTxHexs: result.allTxHexs,
          allPsbtHexs: result.allPsbtHexs,
          receiver: toInfo.address,
          amount: inputAmount,
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
          title={t('send_cat20')}
          onBack={() => {
            setStep(Step.INPUT);
          }}
        />
        <Content>
          {/* Token info */}
          <Card style={{ backgroundColor: colors.bg4, borderRadius: 10 }}>
            <Column>
              <Row itemsCenter>
                <Icon icon="cat20" size={24} />
                <Text text={cat20Info.name} preset="bold" style={{ marginLeft: 8 }} />
              </Row>
              <Text
                text={`-${transferData.current.amount} ${cat20Info.symbol}`}
                preset="bold"
                size="lg"
                style={{ marginTop: 8 }}
              />
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
    <Layout testid={TestIds.CAT20.SEND_SCREEN}>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}
        title={t('send_cat20')}
      />
      <Content>
        <Text text={cat20Info.name} preset="title-bold" textCenter size="xxl" color="text" />
        <Row itemsCenter fullX justifyCenter>
          <Text
            text={`${runesUtils.toDecimalAmount(cat20Balance.amount, cat20Balance.decimals)}`}
            preset="bold"
            textCenter
            size="xxl"
            wrap
            digital
          />
          <BRC20Ticker tick={cat20Info.symbol} preset="lg" />
        </Row>

        <Row justifyCenter fullX>
          <TickUsdWithoutPrice
            tick={cat20Info.tokenId}
            balance={runesUtils.toDecimalAmount(cat20Balance.amount, cat20Balance.decimals)}
            type={TokenType.CAT20}
            size={'md'}
          />
        </Row>

        <Column mt="lg">
          <Input
            preset="address"
            addressInputData={toInfo}
            onAddressInputChange={(val) => {
              setToInfo(val);
            }}
            recipientLabel={<Text text={t('recipient')} preset="regular" color="textDim" />}
            autoFocus={true}
            testid={TestIds.CAT20.SEND_RECIPIENT_INPUT}
          />
        </Column>

        <Column mt="lg">
          <Row justifyBetween>
            <Text text={t('balance')} color="textDim" />
            <TickUsdWithoutPrice tick={cat20Info.tokenId} balance={inputAmount} type={TokenType.CAT20} />
            <Row
              itemsCenter
              onClick={() => {
                setInputAmount(runesUtils.toDecimalAmount(availableTokenAmount, cat20Balance.decimals));
              }}>
              <Text text={t('max')} preset="sub" style={{ color: colors.white_muted }} />
              <Text
                text={`${showLongNumber(runesUtils.toDecimalAmount(availableTokenAmount, cat20Balance.decimals))}`}
                preset="bold"
                size="sm"
                wrap
              />
              <BRC20Ticker tick={cat20Info.symbol} preset="sm" />
            </Row>
          </Row>
          <Input
            preset="amount"
            placeholder={t('amount')}
            value={inputAmount.toString()}
            runesDecimal={cat20Balance.decimals}
            onAmountInputChange={(amount) => {
              setInputAmount(amount);
            }}
            testid={TestIds.CAT20.SEND_AMOUNT_INPUT}
          />

          {shouldShowMerge && (
            <Column style={{ borderWidth: 1, borderRadius: 10, borderColor: 'rgba(var(--color-background-rgb),0.2)' }}>
              <Column mx="md" my="md">
                <Text
                  text={t('to_send_a_larger_amount_please_merge_your_utxos_to_increase_the_available_balance')}
                  size="xs"
                  color="textDim"
                />

                <Text
                  text={t('merge_utxos_to_increase_the_available_balance')}
                  size="xs"
                  color="primary"
                  onClick={() => {
                    navigate('MergeCAT20Screen', {
                      cat20Balance: cat20Balance,
                      cat20Info: cat20Info
                    });
                  }}
                />
              </Column>
            </Column>
          )}
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
          testid={TestIds.CAT20.SEND_NEXT_BUTTON}
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
