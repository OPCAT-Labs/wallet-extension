import { InputNumber, Switch } from 'antd';
import { useEffect, useState } from 'react';

import { SmallPayHistoryItem } from '@/background/service/smallPay';
import { Button, Card, Column, Content, Header, Layout, Row, Text } from '@/ui/components';
import { Empty } from '@/ui/components/Empty';
import { useI18n } from '@/ui/hooks/useI18n';
import { colors } from '@/ui/theme/colors';
import { useChain } from '@/ui/state/settings/hooks';
import { useWallet } from '@/ui/utils';

export default function SmallPayScreen() {
  const wallet = useWallet();
  const { t } = useI18n();
  const chain = useChain();

  const [enabled, setEnabled] = useState(true);
  const [singleLimit, setSingleLimit] = useState(10000);
  const [dailyLimit, setDailyLimit] = useState(5000000);
  const [maxFeeRate, setMaxFeeRate] = useState(0.01);
  const [spent24h, setSpent24h] = useState(0);
  const [history, setHistory] = useState<SmallPayHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [isEnabled, single, daily, fee, spent, records] = await Promise.all([
        wallet.isSmallPayEnabled(),
        wallet.getSmallPaySingleLimit(),
        wallet.getSmallPayDailyLimit(),
        wallet.getSmallPayMaxFeeRate(),
        wallet.getSmallPaySpent24h(),
        wallet.getSmallPayHistory()
      ]);
      setEnabled(isEnabled);
      setSingleLimit(single);
      setDailyLimit(daily);
      setMaxFeeRate(fee);
      setSpent24h(spent);
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

  const handleSingleLimitChange = async (value: number | null) => {
    if (value == null || value < 0) return;
    setSingleLimit(value);
    await wallet.setSmallPaySingleLimit(value);
  };

  const handleDailyLimitChange = async (value: number | null) => {
    if (value == null || value < 0) return;
    setDailyLimit(value);
    await wallet.setSmallPayDailyLimit(value);
  };

  const handleClearHistory = async () => {
    await wallet.clearSmallPayHistory();
    setHistory([]);
    setSpent24h(0);
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

  const inputStyle: React.CSSProperties = {
    background: '#1a1a2e',
    border: '1px solid #333',
    borderRadius: 6,
    color: '#eee',
    width: 120,
    textAlign: 'right' as const
  };

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

          {/* Limits Config */}
          <Card style={{ borderRadius: 10 }}>
            <Column gap="sm">
              <Text text={t('smallpay_limits')} preset="bold" size="sm" />
              <Row style={{ borderTopWidth: 1, borderColor: colors.border }} my="sm" />

              <Row justifyBetween itemsCenter>
                <Text text={t('single_payment_limit')} preset="sub" size="xs" />
                <InputNumber
                  value={singleLimit}
                  min={0}
                  step={1000}
                  onChange={handleSingleLimitChange}
                  style={inputStyle}
                  formatter={(v) => `${v} sats`}
                  parser={(v) => Number((v || '').replace(/[^\d]/g, ''))}
                />
              </Row>

              <Row justifyBetween itemsCenter>
                <Text text={t('daily_limit_24h')} preset="sub" size="xs" />
                <InputNumber
                  value={dailyLimit}
                  min={0}
                  step={100000}
                  onChange={handleDailyLimitChange}
                  style={inputStyle}
                  formatter={(v) => `${v} sats`}
                  parser={(v) => Number((v || '').replace(/[^\d]/g, ''))}
                />
              </Row>

              <Row justifyBetween>
                <Text text={t('max_fee_rate')} preset="sub" size="xs" />
                <Text text={`${maxFeeRate} sat/byte`} size="xs" />
              </Row>
            </Column>
          </Card>

          {/* 24h Spending Summary */}
          <Card style={{ borderRadius: 10, background: spent24h > 0 ? 'rgba(255, 165, 0, 0.08)' : undefined }}>
            <Row justifyBetween itemsCenter>
              <Text text="Spent in last 24h" preset="sub" size="xs" />
              <Text
                text={formatSats(spent24h)}
                size="sm"
                preset="bold"
                color={spent24h > dailyLimit * 0.8 ? 'danger' : 'gold'}
              />
            </Row>
            <Row justifyBetween itemsCenter style={{ marginTop: 4 }}>
              <Text text="Remaining" preset="sub" size="xxs" color="textDim" />
              <Text text={formatSats(Math.max(0, dailyLimit - spent24h))} size="xxs" color="textDim" />
            </Row>
          </Card>

          {/* Payment History */}
          <Card style={{ borderRadius: 10 }}>
            <Text text={t('smallpay_history')} preset="bold" size="sm" />
          </Card>

          <Column gap="sm">
            {history.length > 0 ? (
              <>
                {history.length > 20 && (
                  <Text
                    text={`Showing last 20 of ${history.length} transactions`}
                    preset="sub"
                    size="xxs"
                    color="textDim"
                    textCenter
                  />
                )}
                {history.slice(-20).reverse().map((item, index) => (
                  <Card key={`${item.txid}-${index}`} style={{ borderRadius: 10 }}>
                    <Row justifyBetween itemsCenter>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <a
                          href={`${chain.mempoolSpaceUrl}/tx/${item.txid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#00d4ff', fontSize: 12, textDecoration: 'underline' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.txid.slice(0, 8)}...
                        </a>
                        <span style={{ fontSize: 11, color: '#888' }}>{formatTime(item.timestamp)}</span>
                      </div>
                      <Text text={formatSats(item.amount)} size="xs" color="gold" />
                    </Row>
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
        </Column>
      </Content>
    </Layout>
  );
}
