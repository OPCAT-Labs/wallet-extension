import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useI18n } from '@/ui/hooks/useI18n';
import { useApproval, useWallet } from '@/ui/utils';
import { useEffect, useState } from 'react';

interface Props {
  params: {
    data: {
      logo?: string;
    };
    session: {
      origin: string;
      icon: string;
      name: string;
    };
  };
}

export default function AutoPayment({ params: { data, session } }: Props) {
  const [_, resolveApproval, rejectApproval] = useApproval();
  const { t } = useI18n();
  const wallet = useWallet();

  const [singleLimit, setSingleLimit] = useState(10000);
  const [dailyLimit, setDailyLimit] = useState(5000000);
  const [maxFeeRate, setMaxFeeRate] = useState(1000);

  useEffect(() => {
    const loadLimits = async () => {
      const single = await wallet.getSmallPaySingleLimit();
      const daily = await wallet.getSmallPayDailyLimit();
      const fee = await wallet.getSmallPayMaxFeeRate();
      setSingleLimit(single);
      setDailyLimit(daily);
      setMaxFeeRate(fee);
    };
    loadLimits();
  }, [wallet]);

  const handleCancel = () => {
    rejectApproval();
  };

  const handleConfirm = () => {
    resolveApproval();
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

  return (
    <Layout>
      <Content>
        <Header>
          <WebsiteBar session={session} />
        </Header>
        <Column>
          <Text text={t('auto_payment_request')} preset="title-bold" textCenter mt="lg" />
          <Text
            text={t('auto_payment_description')}
            preset="sub"
            textCenter
            mt="lg"
          />

          <Card style={{ marginTop: 16 }}>
            <Column gap="md">
              <Row justifyBetween>
                <Text text={t('single_payment_limit')} preset="sub" color="textDim" />
                <Text text={formatSats(singleLimit)} preset="bold" />
              </Row>
              <Row justifyBetween>
                <Text text={t('daily_limit_24h')} preset="sub" color="textDim" />
                <Text text={formatSats(dailyLimit)} preset="bold" />
              </Row>
              <Row justifyBetween>
                <Text text={t('max_fee_rate')} preset="sub" color="textDim" />
                <Text text={`${maxFeeRate} sat/vB`} preset="bold" />
              </Row>
            </Column>
          </Card>

          <Card style={{ marginTop: 16, backgroundColor: 'rgba(255, 193, 7, 0.1)' }}>
            <Column gap="sm">
              <Text
                text={t('auto_payment_warning_title')}
                preset="bold"
                color="warning"
              />
              <Text
                text={t('auto_payment_warning')}
                preset="sub"
                color="warning"
              />
            </Column>
          </Card>
        </Column>
      </Content>

      <Footer>
        <Row full>
          <Button text={t('reject')} full preset="default" onClick={handleCancel} />
          <Button text={t('approve')} full preset="primary" onClick={handleConfirm} />
        </Row>
      </Footer>
    </Layout>
  );
}
