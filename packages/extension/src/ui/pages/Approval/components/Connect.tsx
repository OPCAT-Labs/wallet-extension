import { useEffect, useState } from 'react';

import { Account, WebsiteState } from '@/shared/types';
import { Button, Card, Column, Content, Footer, Header, Icon, Layout, Row, Text } from '@/ui/components';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useI18n } from '@/ui/hooks/useI18n';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useCurrentKeyring } from '@/ui/state/keyrings/hooks';
import { fontSizes } from '@/ui/theme/font';
import { shortAddress, useApproval, useWallet } from '@/ui/utils';
import { TestIds } from '@/ui/utils/test-ids';
import { CheckCircleFilled, LoadingOutlined } from '@ant-design/icons';

interface MyItemProps {
  account?: Account;
  selected?: boolean;
  onClick?: () => void;
}

export interface ItemData {
  key: string;
  account?: Account;
}

export function MyItem({ account, selected, onClick }: MyItemProps) {
  if (!account) {
    return <div />;
  }

  return (
    <Card justifyBetween mt="sm" onClick={onClick}>
      <Row>
        <Column style={{ width: 20 }} selfItemsCenter>
          {selected && (
            <Icon>
              <CheckCircleFilled />
            </Icon>
          )}
        </Column>
        <Column>
          <Text text={account.alianName} />
          <Text text={`${shortAddress(account.address, 20)}`} preset="sub" />
        </Column>
      </Row>
      <Column relative></Column>
    </Card>
  );
}

interface Props {
  params: {
    session: {
      origin: string;
      icon: string;
      name: string;
    };
  };
}

const OPTIONAL_PERMISSIONS = [
  { key: 'ecdh', label: 'ECDH Key Exchange', desc: 'Compute shared secrets' },
  { key: 'getPKHByPath', label: 'Derive PKH', desc: 'Derive public key hashes' },
  { key: 'smallPay', label: 'SmallPay', desc: 'Auto-payment within limits' }
];

export default function Connect({ params: { session } }: Props) {
  const [_getApproval, resolveApproval, rejectApproval] = useApproval();
  const { t } = useI18n();

  const [checkedPerms, setCheckedPerms] = useState<Record<string, boolean>>({});

  const togglePerm = (key: string) => {
    setCheckedPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCancel = () => {
    rejectApproval(t('user_rejected_the_request'));
  };

  const handleConnect = async () => {
    const grantedPermissions = ['connect'];
    for (const [key, val] of Object.entries(checkedPerms)) {
      if (val) grantedPermissions.push(key);
    }
    resolveApproval({ grantedPermissions });
  };

  const wallet = useWallet();

  const currentKeyring = useCurrentKeyring();
  const currentAccount = useCurrentAccount();

  const [checkState, setCheckState] = useState(WebsiteState.CHECKING);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    wallet.checkWebsite(session.origin).then((v) => {
      if (v.isScammer) {
        setCheckState(WebsiteState.SCAMMER);
      } else {
        setCheckState(WebsiteState.SAFE);
      }
      if (v.warning) {
        setWarning(v.warning);
      }
    });
  }, []);

  if (checkState === WebsiteState.CHECKING) {
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

  if (checkState === WebsiteState.SCAMMER) {
    return (
      <Layout>
        <Header>
          <WebsiteBar session={session} />
        </Header>
        <Content>
          <Column>
            <Text text={t('phishing_detection')} preset="title-bold" textCenter mt="xxl" />
            <Text text={t('malicious_behavior_and_suspicious_activity_have_be')} mt="md" />
            <Text text={t('your_access_to_this_page_has_been_restricted_by_un')} mt="md" />
          </Column>
        </Content>

        <Footer>
          <Row full>
            <Button text={t('reject_blocked_by_unisat_wallet')} preset="danger" onClick={handleCancel} full />
          </Row>
        </Footer>
      </Layout>
    );
  }

  if (warning) {
    return (
      <Layout>
        <Header>
          <WebsiteBar session={session} />
        </Header>
        <Content>
          <Column>
            <Text text={t('warning')} preset="title-bold" textCenter mt="xxl" />
            <Text text={warning} mt="md" />
          </Column>
        </Content>

        <Footer>
          <Row full>
            <Button
              text={t('i_am_aware_of_the_risks')}
              preset="danger"
              onClick={() => {
                setWarning('');
              }}
              full
            />
          </Row>
        </Footer>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header>
        <WebsiteBar session={session} />
      </Header>
      <Content>
        <Column>
          <Text text={t('connect_with_unisat_wallet')} preset="title-bold" textCenter mt="lg" />
          <Text text={t('select_the_account_to_use_on_this_site')} textCenter mt="md" />
          <Text text={t('only_connect_with_sites_you_trust')} preset="sub" textCenter mt="md" />

          <Text text={currentKeyring.alianName} preset="sub" />
          <MyItem account={currentAccount} />

          {/* Optional permissions */}
          <Text text={t('permission_request') || 'Permissions'} preset="sub" mt="lg" />
          {OPTIONAL_PERMISSIONS.map((perm) => {
            const isChecked = checkedPerms[perm.key] ?? false;
            return (
              <div
                key={perm.key}
                onClick={() => togglePerm(perm.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 0',
                  cursor: 'pointer',
                  gap: 10
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${isChecked ? '#4caf50' : '#555'}`,
                    background: isChecked ? '#4caf50' : 'transparent',
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
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#eee', fontWeight: 500 }}>{perm.label}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{perm.desc}</div>
                </div>
              </div>
            );
          })}
        </Column>
      </Content>

      <Footer>
        <Row full>
          <Button text={t('cancel')} preset="default" onClick={handleCancel} full testid={TestIds.APPROVAL.REJECT_BUTTON} />
          <Button text={t('connect')} preset="primary" onClick={handleConnect} full testid={TestIds.APPROVAL.APPROVE_BUTTON} />
        </Row>
      </Footer>
    </Layout>
  );
}
