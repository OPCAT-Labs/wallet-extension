import { Switch } from 'antd';
import { useEffect, useState } from 'react';

import { SmallPayHistoryItem, SmallPayWhitelistItem } from '@/background/service/smallPay';
import { Button, Card, Column, Content, Header, Icon, Image, Layout, Row, Text } from '@/ui/components';
import { Empty } from '@/ui/components/Empty';
import { useI18n } from '@/ui/hooks/useI18n';
import { colors } from '@/ui/theme/colors';
import { fontSizes } from '@/ui/theme/font';
import { formatSessionIcon, useWallet } from '@/ui/utils';

type TabType = 'whitelist' | 'history';

export default function SmallPayScreen() {
  const wallet = useWallet();
  const { t } = useI18n();

  const [enabled, setEnabled] = useState(false);
  const [singleLimit, setSingleLimit] = useState(10000);
  const [dailyLimit, setDailyLimit] = useState(5000000);
  const [maxFeeRate, setMaxFeeRate] = useState(1000);
  const [whitelist, setWhitelist] = useState<SmallPayWhitelistItem[]>([]);
  const [history, setHistory] = useState<SmallPayHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('whitelist');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [isEnabled, single, daily, fee, sites, records] = await Promise.all([
        wallet.isSmallPayEnabled(),
        wallet.getSmallPaySingleLimit(),
        wallet.getSmallPayDailyLimit(),
        wallet.getSmallPayMaxFeeRate(),
        wallet.getSmallPayWhitelist(),
        wallet.getSmallPayHistory()
      ]);
      setEnabled(isEnabled);
      setSingleLimit(single);
      setDailyLimit(daily);
      setMaxFeeRate(fee);
      setWhitelist(sites);
      setHistory(records);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleEnabled = async () => {
    const newValue = !enabled;
    await wallet.setSmallPayEnabled(newValue);
    setEnabled(newValue);
  };

  const handleRemoveSite = async (origin: string) => {
    await wallet.removeSmallPayOrigin(origin);
    loadData();
  };

  const handleClearHistory = async () => {
    await wallet.clearSmallPayHistory();
    setHistory([]);
  };

  const formatSats = (sats: number) => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(2)} BTC`;
    } else if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(2)}M sats`;
    } else if (sats >= 1000) {
      return `${(sats / 1000).toFixed(1)}K sats`;
    }
    return `${sats} sats`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <Layout>
        <Header onBack={() => window.history.go(-1)} title={t('smallpay_settings')} />
        <Content justifyCenter itemsCenter>
          <Text text={t('loading')} />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header onBack={() => window.history.go(-1)} title={t('smallpay_settings')} />
      <Content>
        <Column gap="md">
          {/* Enable/Disable Toggle */}
          <Card style={{ borderRadius: 10 }}>
            <Row justifyBetween itemsCenter>
              <Column>
                <Text text={t('smallpay_enabled')} preset="bold" size="sm" />
                <Text text={t('auto_payment_description')} preset="sub" size="xs" style={{ marginTop: 4 }} />
              </Column>
              <Switch checked={enabled} onChange={handleToggleEnabled} />
            </Row>
          </Card>

          {/* Limits Display */}
          <Card style={{ borderRadius: 10 }}>
            <Column gap="sm">
              <Text text={t('smallpay_limits')} preset="bold" size="sm" />
              <Row style={{ borderTopWidth: 1, borderColor: colors.border }} my="sm" />
              <Row justifyBetween>
                <Text text={t('single_payment_limit')} preset="sub" size="xs" />
                <Text text={formatSats(singleLimit)} size="xs" />
              </Row>
              <Row justifyBetween>
                <Text text={t('daily_limit_24h')} preset="sub" size="xs" />
                <Text text={formatSats(dailyLimit)} size="xs" />
              </Row>
              <Row justifyBetween>
                <Text text={t('max_fee_rate')} preset="sub" size="xs" />
                <Text text={`${maxFeeRate} sat/vB`} size="xs" />
              </Row>
            </Column>
          </Card>

          {/* Tabs */}
          <Row style={{ gap: 8 }}>
            <Button
              text={t('smallpay_whitelist')}
              preset={activeTab === 'whitelist' ? 'primary' : 'default'}
              style={{ flex: 1 }}
              onClick={() => setActiveTab('whitelist')}
            />
            <Button
              text={t('smallpay_history')}
              preset={activeTab === 'history' ? 'primary' : 'default'}
              style={{ flex: 1 }}
              onClick={() => setActiveTab('history')}
            />
          </Row>

          {/* Whitelist Tab */}
          {activeTab === 'whitelist' && (
            <Column gap="sm">
              {whitelist.length > 0 ? (
                whitelist.map((item) => (
                  <Card key={item.origin} style={{ borderRadius: 10 }}>
                    <Row full justifyBetween itemsCenter>
                      <Row itemsCenter style={{ flex: 1, overflow: 'hidden' }}>
                        <Image
                          src={formatSessionIcon({ icon: item.logo || '', origin: item.origin, name: item.origin })}
                          size={fontSizes.logo}
                        />
                        <Column style={{ marginLeft: 8, overflow: 'hidden' }}>
                          <Text
                            text={item.origin}
                            preset="sub"
                            size="xs"
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          />
                          <Text
                            text={formatTime(item.approvedAt)}
                            preset="sub"
                            size="xxs"
                            color="textDim"
                          />
                        </Column>
                      </Row>
                      <Icon
                        icon="close"
                        onClick={() => handleRemoveSite(item.origin)}
                        style={{ cursor: 'pointer' }}
                      />
                    </Row>
                  </Card>
                ))
              ) : (
                <Card style={{ borderRadius: 10 }}>
                  <Empty text={t('smallpay_no_whitelist')} />
                </Card>
              )}
            </Column>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <Column gap="sm">
              {history.length > 0 ? (
                <>
                  {history.slice(-20).reverse().map((item, index) => (
                    <Card key={`${item.txid}-${index}`} style={{ borderRadius: 10 }}>
                      <Column gap="xs">
                        <Row justifyBetween>
                          <Text text={item.origin} preset="sub" size="xs" />
                          <Text text={formatSats(item.amount)} size="xs" color="gold" />
                        </Row>
                        <Row justifyBetween>
                          <Text
                            text={item.txid.slice(0, 16) + '...' + item.txid.slice(-8)}
                            preset="sub"
                            size="xxs"
                            color="textDim"
                          />
                          <Text text={formatTime(item.timestamp)} preset="sub" size="xxs" color="textDim" />
                        </Row>
                      </Column>
                    </Card>
                  ))}
                  <Button
                    text={t('smallpay_clear_history')}
                    preset="default"
                    onClick={handleClearHistory}
                  />
                </>
              ) : (
                <Card style={{ borderRadius: 10 }}>
                  <Empty text={t('smallpay_no_history')} />
                </Card>
              )}
            </Column>
          )}
        </Column>
      </Content>
    </Layout>
  );
}
