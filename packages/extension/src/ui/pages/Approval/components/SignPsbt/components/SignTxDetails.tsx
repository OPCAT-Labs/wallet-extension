import { useMemo } from 'react';

import { CAT20Balance, RawTxInfo, TickPriceItem, TxType } from '@/shared/types';
import { Card, Column, Image, Row, Text } from '@/ui/components';
import { AddressText } from '@/ui/components/AddressText';
import AssetTag from '@/ui/components/AssetTag';
import { BtcUsd } from '@/ui/components/BtcUsd';
import { useI18n } from '@/ui/hooks/useI18n';
import { useAccountAddress } from '@/ui/state/accounts/hooks';
import { useBTCUnit, useChain } from '@/ui/state/settings/hooks';
import { colors } from '@/ui/theme/colors';
import { satoshisToAmount } from '@/ui/utils';

import CAT20PreviewCard from '@/ui/components/CAT20PreviewCard';
import { TxInfo } from '../types';

export default function SignTxDetails({
  txInfo,
  type,
  rawTxInfo,
  cat20PriceMap
}: {
  txInfo: TxInfo;
  rawTxInfo?: RawTxInfo;
  type: TxType;
  cat20PriceMap: undefined | { [key: string]: TickPriceItem };
}) {
  const address = useAccountAddress();
  const chain = useChain();
  const btcUnit = useBTCUnit();
  const { t } = useI18n();


  const isCurrentToPayFee = useMemo(() => {
    if (type === TxType.SIGN_TX) {
      return false;
    } else {
      return true;
    }
  }, [type]);

  const spendSatoshis = useMemo(() => {
    const inValue = txInfo.decodedPsbt.inputInfos
      .filter((v) => v.address === address)
      .reduce((pre, cur) => cur.value + pre, 0);
    const outValue = txInfo.decodedPsbt.outputInfos
      .filter((v) => v.address === address)
      .reduce((pre, cur) => cur.value + pre, 0);
    const spend = inValue - outValue;
    return spend;
  }, [txInfo.decodedPsbt]);

  const sendingSatoshis = useMemo(() => {
    const inValue = txInfo.decodedPsbt.inputInfos
      .filter((v) => v.address === address)
      .reduce((pre, cur) => cur.value + pre, 0);
    return inValue;
  }, [txInfo.decodedPsbt]);

  const receivingSatoshis = useMemo(() => {
    const outValue = txInfo.decodedPsbt.outputInfos
      .filter((v) => v.address === address)
      .reduce((pre, cur) => cur.value + pre, 0);
    return outValue;
  }, [txInfo.decodedPsbt]);

  const spendAmount = useMemo(() => satoshisToAmount(spendSatoshis), [spendSatoshis]);
  const balanceChangedAmount = useMemo(
    () => satoshisToAmount(receivingSatoshis - sendingSatoshis),
    [sendingSatoshis, receivingSatoshis]
  );
  const feeAmount = useMemo(() => satoshisToAmount(txInfo.decodedPsbt.fee), [txInfo.decodedPsbt]);

  const cat20Count = txInfo.decodedPsbt.inputInfos.reduce((pre, cur) => (cur.cat20 ? cur.cat20.length : 0) + pre, 0);
  const cat20Array: CAT20Balance[] = [];
  txInfo.decodedPsbt.inputInfos.forEach((v) => {
    if (v.cat20) {
      v.cat20.forEach((w) => {
        cat20Array.push(w);
      });
    }
  });

  const involvedAssets = useMemo(() => {
    const involved = cat20Count > 0;
    if (!involved) return;
    return (
      <Column>
        <Text text={t('involved_assets')} preset="bold" />
        <Column justifyCenter>

          {cat20Array.length > 0 ? (
            <Column
              fullX
              px="md"
              pt="md"
              pb="md"
              style={{
                backgroundColor: 'rgba(var(--color-background-rgb), 0.04)',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border
              }}>
              <Row>
                <AssetTag type="CAT20" />
              </Row>
              <Row overflowX>
                {cat20Array.map((w, index) => {
                  return <CAT20PreviewCard key={'cat20_' + index} balance={w} price={cat20PriceMap?.[w.tokenId]} />;
                })}
              </Row>
            </Column>
          ) : null}
        </Column>
      </Column>
    );
  }, []);

  if (type === TxType.SIGN_TX) {
    return (
      <Column gap="lg">
        <Row itemsCenter justifyCenter fullX py={'sm'}>
          <Text text={t('sign_transaction')} preset="title-bold" textCenter />
        </Row>
        <Row justifyCenter fullX>
          <Card style={{ backgroundColor: 'rgba(0, 0, 0, 0.04)', flex: '1' }}>
            <Column fullX itemsCenter>
              <Row itemsCenter>
                <Image src={chain.icon} size={24} />
                <Text text={chain.label} />
              </Row>
              <Row
                style={{ borderTopWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignSelf: 'stretch' }}
                my="md"
              />
              <Column justifyCenter>
                <Row itemsCenter>
                  <Text
                    text={(receivingSatoshis > sendingSatoshis ? '+' : '') + balanceChangedAmount}
                    color={receivingSatoshis > sendingSatoshis ? 'text' : 'text'}
                    preset="bold"
                    textCenter
                    size="xxl"
                  />
                  <Text text={btcUnit} color="textDim" />
                </Row>
                <Row justifyCenter>
                  <BtcUsd sats={Math.abs(receivingSatoshis - sendingSatoshis)} bracket />
                </Row>
              </Column>
            </Column>
          </Card>
        </Row>
        <div />

        {involvedAssets}
      </Column>
    );
  }

  return (
    <Column gap="lg" style={{ position: 'relative' }}>
      <Row itemsCenter justifyCenter fullX py={'sm'}>
        <Text text={t('sign_transaction')} preset="title-bold" textCenter />
      </Row>
      <Row justifyCenter>
        <Card style={{ backgroundColor: 'rgba(0, 0, 0, 0.04)', flex: '1' }}>
          <Column fullX itemsCenter>
            <Row itemsCenter justifyCenter>
              <Image src={chain.icon} size={24} />
              <Text text={chain.label} />
            </Row>
            <Row
              style={{ borderTopWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignSelf: 'stretch' }}
              my="md"
            />
            {rawTxInfo && (
              <Column>
                <Text text={t('send_to')} textCenter color="textDim" />
                <Row justifyCenter>
                  <AddressText addressInfo={rawTxInfo.toAddressInfo} textCenter />
                </Row>
              </Column>
            )}
            {rawTxInfo && (
              <Row
                style={{ borderTopWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignSelf: 'stretch' }}
                my="md"
              />
            )}
            <Column>
              <Text text={t('spend_amount')} textCenter color="textDim" />

              <Column justifyCenter>
                <Row itemsCenter>
                  <Text text={spendAmount + ' ' + btcUnit} color="text" preset="bold" textCenter size="xxl" />
                </Row>
                <BtcUsd sats={spendSatoshis} textCenter bracket style={{ marginTop: -8 }} />
                {isCurrentToPayFee && (
                  <Text text={`${feeAmount} ${btcUnit} (${t('network_fee_2')})`} preset="sub" textCenter />
                )}
              </Column>
            </Column>
          </Column>
        </Card>
      </Row>
      {involvedAssets}
    </Column>
  );
}
