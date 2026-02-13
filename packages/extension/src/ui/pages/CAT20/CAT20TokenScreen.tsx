import { useEffect, useMemo, useState } from 'react';

import { KEYRING_TYPE } from '@/shared/constant';
import { runesUtils } from '@/shared/lib/runes-utils';
import { AddressCAT20TokenSummary } from '@/shared/types';
import { Button, Column, Content, Header, Icon, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { BRC20Ticker } from '@/ui/components/BRC20Ticker';
import { Line } from '@/ui/components/Line';
import { Section } from '@/ui/components/Section';
import { TickUsdWithoutPrice, TokenType } from '@/ui/components/TickUsd';
import { useI18n } from '@/ui/hooks/useI18n';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useCurrentKeyring } from '@/ui/state/keyrings/hooks';
import { useCAT20MarketPlaceWebsite, useCAT20TokenInfoExplorerUrl, useChainType } from '@/ui/state/settings/hooks';
import { colors } from '@/ui/theme/colors';
import { fontSizes } from '@/ui/theme/font';
import { copyToClipboard, shortAddress, showLongNumber, useLocationState, useWallet } from '@/ui/utils';
import { TestIds } from '@/ui/utils/test-ids';
import { CopyOutlined, LoadingOutlined } from '@ant-design/icons';

import { useNavigate } from '../MainRoute';

interface LocationState {
  tokenId: string;
}

export default function CAT20TokenScreen() {
  const { tokenId } = useLocationState<LocationState>();
  const [tokenSummary, setTokenSummary] = useState<AddressCAT20TokenSummary>({
    cat20Balance: {
      tokenId: '',
      amount: '0',
      decimals: 0,
      symbol: '',
      name: ''
    },
    cat20Info: {
      tokenId: '',
      name: '',
      symbol: '',
      max: '0',
      premine: '0',
      limit: 0
    }
  });

  const wallet = useWallet();
  const { t } = useI18n();

  const account = useCurrentAccount();

  const keyring = useCurrentKeyring();
  const tools = useTools();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wallet.getAddressCAT20TokenSummary(account.address, tokenId).then((tokenSummary) => {
      setTokenSummary(tokenSummary);
      setLoading(false);
    });
  }, []);

  const navigate = useNavigate();

  const tokenUrl = useCAT20TokenInfoExplorerUrl(tokenSummary.cat20Info.tokenId);

  const enableTransfer = useMemo(() => {
    let enable = false;
    if (tokenSummary.cat20Balance && tokenSummary.cat20Balance.amount !== '0') {
      enable = true;
    }
    return enable;
  }, [tokenSummary]);

  const chainType = useChainType();
  const enableTrade = useMemo(() => {
    return false;
  }, [chainType]);
  const marketPlaceUrl = useCAT20MarketPlaceWebsite(tokenId);

  if (loading) {
    return (
      <Layout>
        <Content itemsCenter justifyCenter>
          <Icon size={fontSizes.xxxl} color="primary">
            <LoadingOutlined />
          </Icon>
        </Content>
      </Layout>
    );
  }

  if (!tokenSummary || !tokenSummary.cat20Balance) {
    return (
      <Layout>
        <Header
          onBack={() => {
            window.history.go(-1);
          }}
        />
        <Content itemsCenter justifyCenter>
          <Text text={t('token_not_found')} />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout testid={TestIds.CAT20.TOKEN_SCREEN}>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}
      />
      {tokenSummary && (
        <Content>
          <Column py="xl" pb="lg" style={{ borderBottomWidth: 1, borderColor: colors.white_muted }}>
            <Text
              text={tokenSummary.cat20Info.name}
              preset="title-bold"
              textCenter
              size="xxl"
              color="text"
              testid={TestIds.CAT20.TOKEN_NAME}
            />
            <Row itemsCenter fullX justifyCenter>
              <Text
                text={`${runesUtils.toDecimalAmount(
                  tokenSummary.cat20Balance.amount,
                  tokenSummary.cat20Balance.decimals
                )}`}
                preset="bold"
                textCenter
                size="xxl"
                wrap
                digital
              />
              <BRC20Ticker tick={tokenSummary.cat20Info.symbol} preset="lg" />
            </Row>

            <Row justifyCenter fullX>
              <TickUsdWithoutPrice
                tick={tokenSummary.cat20Info.tokenId}
                balance={runesUtils.toDecimalAmount(
                  tokenSummary.cat20Balance.amount,
                  tokenSummary.cat20Balance.decimals
                )}
                type={TokenType.CAT20}
                size={'md'}
              />
            </Row>

            <Row justifyBetween mt="lg">
              <Button
                text={t('send')}
                preset="home"
                icon="send"
                disabled={!enableTransfer}
                testid={TestIds.CAT20.SEND_BUTTON}
                onClick={(_e) => {
                  if (keyring.type === KEYRING_TYPE.KeystoneKeyring) {
                    tools.toastError(t('send_cat20_is_not_supported_for_keystone_yet'));
                    return;
                  }
                  navigate('SendCAT20Screen', {
                    cat20Balance: tokenSummary.cat20Balance,
                    cat20Info: tokenSummary.cat20Info
                  });
                }}
                full
              />

              <Button
                text={t('receive')}
                preset="home"
                icon="receive"
                onClick={() => {
                  navigate('ReceiveScreen');
                }}
                full
              />

              {enableTrade ? (
                <Button
                  text={t('trade')}
                  preset="home"
                  icon="trade"
                  disabled={!enableTrade}
                  onClick={(_e) => {
                    window.open(marketPlaceUrl);
                  }}
                  full
                />
              ) : null}
            </Row>
          </Column>

          <Column
            gap="lg"
            px="md"
            py="md"
            style={{
              backgroundColor: 'rgba(var(--color-background-rgb),0.04)',
              borderRadius: 15
            }}>
            <Section
              title={t('token_id')}
              value={tokenSummary.cat20Info.tokenId}
              rightComponent={
                <Row gap="sm" itemsCenter>
                  <Text
                    text={shortAddress(tokenSummary.cat20Info.tokenId, 10)}
                    preset="link"
                    size="xs"
                    onClick={() => window.open(tokenUrl)}
                  />
                  <Icon
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(tokenSummary.cat20Info.tokenId).then(() => {
                        tools.toastSuccess(t('copied'));
                      });
                    }}
                    style={{ cursor: 'pointer', fontSize: 14 }}>
                    <CopyOutlined />
                  </Icon>
                </Row>
              }
            />
            <Line />
            <Section title={t('name')} value={tokenSummary.cat20Info.name} />
            <Line />

            <Section title={t('symbol')} value={tokenSummary.cat20Info.symbol} />
            <Line />

            <Section title={t('decimals')} value={tokenSummary.cat20Balance.decimals} />
            <Line />

            <Section
              title={t('supply')}
              value={`${showLongNumber(runesUtils.toDecimalAmount(tokenSummary.cat20Info.max, 0))} ${
                tokenSummary.cat20Info.symbol
              }`}
            />
            <Line />

            <Section
              title={t('premine')}
              value={`${showLongNumber(runesUtils.toDecimalAmount(tokenSummary.cat20Info.premine, 0))} ${
                tokenSummary.cat20Info.symbol
              }`}
            />
          </Column>
        </Content>
      )}
    </Layout>
  );
}
