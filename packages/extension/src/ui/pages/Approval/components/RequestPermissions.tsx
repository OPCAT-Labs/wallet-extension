import { useEffect, useState } from 'react';

import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useI18n } from '@/ui/hooks/useI18n';
import { useApproval } from '@/ui/utils';
import { TestIds } from '@/ui/utils/test-ids';

const PERMISSION_INFO: Record<string, { label: string; labelZh: string; desc: string; descZh: string; risk: string }> = {
  connect: {
    label: 'Connect',
    labelZh: '连接',
    desc: 'View your address, public key and balance',
    descZh: '查看您的地址、公钥和余额',
    risk: 'low'
  },
  ecdh: {
    label: 'ECDH Key Exchange',
    labelZh: 'ECDH 密钥交换',
    desc: 'Compute shared secrets for encrypted communication',
    descZh: '计算用于加密通信的共享密钥',
    risk: 'medium'
  },
  getPKHByPath: {
    label: 'Derive PKH',
    labelZh: '派生公钥哈希',
    desc: 'Derive public key hashes from custom paths',
    descZh: '从自定义路径派生公钥哈希',
    risk: 'medium'
  },
  smallPay: {
    label: 'SmallPay Auto-Payment',
    labelZh: '小额自动支付',
    desc: 'Auto-sign small transactions within configured limits',
    descZh: '在配置限额内自动签名小额交易',
    risk: 'high'
  }
};

interface Props {
  params: {
    data: {
      permissions: string[];
    };
    session: {
      origin: string;
      icon: string;
      name: string;
    };
  };
}

export default function RequestPermissions({ params: { data, session } }: Props) {
  const [_, resolveApproval, rejectApproval] = useApproval();
  const { t } = useI18n();
  const requestedPerms = data.permissions || [];

  // Track which permissions user has checked (connect always on)
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const p of requestedPerms) {
      initial[p] = true;
    }
    initial['connect'] = true; // always required
    setChecked(initial);
  }, []);

  const handleToggle = (perm: string) => {
    if (perm === 'connect') return; // cannot uncheck connect
    setChecked((prev) => ({ ...prev, [perm]: !prev[perm] }));
  };

  const handleCancel = () => {
    rejectApproval();
  };

  const handleConfirm = () => {
    const grantedPermissions = Object.entries(checked)
      .filter(([, v]) => v)
      .map(([k]) => k);
    resolveApproval({ grantedPermissions });
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'high') return '#ff4757';
    if (risk === 'medium') return '#ffa500';
    return '#4caf50';
  };

  return (
    <Layout>
      <Content>
        <Header>
          <WebsiteBar session={session} />
        </Header>
        <Column>
          <Text text={t('permission_request') || 'Permission Request'} preset="title-bold" textCenter mt="lg" />
          <Text
            text={t('permission_request_desc') || 'This site is requesting the following permissions:'}
            preset="sub"
            textCenter
            mt="md"
          />

          {requestedPerms.map((perm) => {
            const info = PERMISSION_INFO[perm];
            if (!info) return null;
            const isConnect = perm === 'connect';
            const isChecked = checked[perm] ?? false;

            return (
              <Card
                key={perm}
                style={{
                  marginTop: 12,
                  cursor: isConnect ? 'default' : 'pointer',
                  opacity: isChecked ? 1 : 0.5,
                  border: isChecked ? `1px solid ${getRiskColor(info.risk)}` : '1px solid #333'
                }}
                onClick={() => handleToggle(perm)}
              >
                <Row justifyBetween itemsCenter>
                  <Column>
                    <Row itemsCenter gap="sm">
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: `2px solid ${isChecked ? getRiskColor(info.risk) : '#555'}`,
                          background: isChecked ? getRiskColor(info.risk) : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          color: '#fff',
                          flexShrink: 0
                        }}
                      >
                        {isChecked ? '✓' : ''}
                      </div>
                      <Text text={info.label} preset="bold" size="sm" />
                      {isConnect && (
                        <Text text="(required)" preset="sub" size="xxs" color="textDim" />
                      )}
                    </Row>
                    <Text text={info.desc} preset="sub" size="xxs" color="textDim" style={{ marginTop: 4, marginLeft: 26 }} />
                  </Column>
                </Row>
              </Card>
            );
          })}

          <Card style={{ marginTop: 16, backgroundColor: 'rgba(255, 193, 7, 0.1)' }}>
            <Text
              text={t('permission_warning') || 'Only approve permissions for sites you trust.'}
              preset="sub"
              color="warning"
            />
          </Card>
        </Column>
      </Content>

      <Footer>
        <Row full>
          <Button text={t('reject')} full preset="default" onClick={handleCancel} testid={TestIds.APPROVAL.REJECT_BUTTON} />
          <Button text={t('approve')} full preset="primary" onClick={handleConfirm} testid={TestIds.APPROVAL.APPROVE_BUTTON} />
        </Row>
      </Footer>
    </Layout>
  );
}
