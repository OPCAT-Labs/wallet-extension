import QRCode from 'qrcode.react';

import { AddressBar, Column, Content, Header, Icon, Layout, Row, Text } from '@/ui/components';
import { useI18n } from '@/ui/hooks/useI18n';
import { useAccountAddress, useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useChain } from '@/ui/state/settings/hooks';
import { sizes } from '@/ui/theme/spacing';

import './index.less';

export default function ReceiveScreen() {
  const currentAccount = useCurrentAccount();
  const address = useAccountAddress();
  const chain = useChain();
  const { t } = useI18n();

  return (
    <Layout>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}
        title={t('address_label')}
      />
      <Content>
        <Column gap="xl" mt="lg">
          <Column
            justifyCenter
            rounded
            style={{ backgroundColor: 'white', alignSelf: 'center', alignItems: 'center', padding: 10 }}>
            <QRCode
              value={address || ''}
              renderAs="svg"
              size={sizes.qrcode}
              imageRendering={chain.icon}
              imageSettings={{
                src: chain.icon,
                width: 30,
                height: 30,
                excavate: true
              }}></QRCode>
          </Column>

          <Row justifyCenter>
            <Icon icon="user" />
            <Text preset="regular-bold" text={currentAccount?.alianName} />
          </Row>
          <AddressBar />

          <Column
            style={{
              backgroundColor: 'var(--color-warning-bg)',
              borderRadius: 8,
              padding: '12px 16px',
              marginTop: 4
            }}>
            <Text
              preset="sub"
              color="warning_content"
              style={{ lineHeight: '1.6', textAlign: 'center' }}
              text={t('receive_notice_opcat_only')}
            />
            <span
              style={{
                fontSize: 12,
                lineHeight: '1.6',
                textAlign: 'center',
                color: 'var(--color-warning-content)',
                marginTop: 8
              }}>
              {t('receive_notice_bridge_prefix')}
              <a
                href="https://bridge.opcatlabs.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                bridge.opcatlabs.io
              </a>
              {t('receive_notice_bridge_suffix')}
            </span>
          </Column>
        </Column>
      </Content>
    </Layout>
  );
}
