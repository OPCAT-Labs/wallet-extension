import { useEffect, useState } from 'react';

import { ConnectedSite, PermissionType } from '@/background/service/permission';
import { Card, Column, Content, Header, Icon, Image, Layout, Row, Text } from '@/ui/components';
import { Empty } from '@/ui/components/Empty';
import { useI18n } from '@/ui/hooks/useI18n';
import { fontSizes } from '@/ui/theme/font';
import { formatSessionIcon, useWallet } from '@/ui/utils';

const ALL_PERMISSIONS: { key: PermissionType; label: string; desc: string }[] = [
  { key: 'connect', label: 'Connect', desc: 'View address & balance' },
  { key: 'ecdh', label: 'ECDH', desc: 'Shared secret computation' },
  { key: 'getPKHByPath', label: 'PKH', desc: 'Derive public key hashes' },
  { key: 'smallPay', label: 'SmallPay', desc: 'Auto-payment within limits' }
];

function getGrantedPerms(site: ConnectedSite): PermissionType[] {
  const perms: PermissionType[] = ['connect'];
  if (site.permissions) {
    for (const [key, val] of Object.entries(site.permissions)) {
      if (val?.granted && key !== 'connect') {
        perms.push(key as PermissionType);
      }
    }
  }
  return perms;
}

export default function ConnectedSitesScreen() {
  const wallet = useWallet();
  const { t } = useI18n();

  const [sites, setSites] = useState<ConnectedSite[]>([]);
  const [expandedOrigin, setExpandedOrigin] = useState<string | null>(null);

  const getSites = async () => {
    const sites = await wallet.getConnectedSites();
    setSites(sites.filter((v) => v.origin));
  };

  useEffect(() => {
    getSites();
  }, []);

  const handleRemove = async (origin: string) => {
    await wallet.removeConnectedSite(origin);
    setExpandedOrigin(null);
    getSites();
  };

  const handleTogglePermission = async (origin: string, perm: PermissionType, currentlyGranted: boolean) => {
    if (perm === 'connect') return;
    if (currentlyGranted) {
      await wallet.revokeSitePermission(origin, perm);
    } else {
      await wallet.grantSitePermissions(origin, [perm]);
    }
    getSites();
  };

  return (
    <Layout>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}
        title={t('connected_sites')}
      />
      <Content>
        <Column>
          {sites.length > 0 ? (
            sites.map((item) => {
              const grantedPerms = getGrantedPerms(item);
              const isExpanded = expandedOrigin === item.origin;

              return (
                <Card key={item.origin} style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    {/* Site header row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                      onClick={() => setExpandedOrigin(isExpanded ? null : item.origin)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, gap: 8 }}>
                        <Image src={formatSessionIcon(item)} size={fontSizes.logo} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <Text
                            text={item.origin}
                            preset="sub"
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                          />
                          <Text
                            text={grantedPerms.join(' · ')}
                            size="xxs"
                            color="textDim"
                            style={{ marginTop: 2 }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                        <span style={{ fontSize: 10, color: '#888' }}>{isExpanded ? '▲' : '▼'}</span>
                        <Icon
                          icon="close"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(item.origin);
                          }}
                        />
                      </div>
                    </div>

                    {/* Expanded permission toggles */}
                    {isExpanded && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #333', width: '100%' }}>
                        {ALL_PERMISSIONS.map((perm) => {
                          const isGranted = grantedPerms.includes(perm.key);
                          const isConnect = perm.key === 'connect';

                          return (
                            <div
                              key={perm.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 0',
                                cursor: isConnect ? 'default' : 'pointer',
                                opacity: isConnect ? 0.6 : 1,
                                width: '100%'
                              }}
                              onClick={() => !isConnect && handleTogglePermission(item.origin, perm.key, isGranted)}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: isGranted ? 600 : 400, color: '#eee' }}>
                                  {perm.label}
                                </div>
                                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                                  {perm.desc}
                                </div>
                              </div>
                              <div
                                style={{
                                  width: 36,
                                  height: 20,
                                  borderRadius: 10,
                                  background: isGranted ? '#4caf50' : '#555',
                                  position: 'relative',
                                  transition: 'background 0.2s',
                                  flexShrink: 0,
                                  marginLeft: 12
                                }}
                              >
                                <div
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 8,
                                    background: '#fff',
                                    position: 'absolute',
                                    top: 2,
                                    left: isGranted ? 18 : 2,
                                    transition: 'left 0.2s'
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          ) : (
            <Empty />
          )}
        </Column>
      </Content>
    </Layout>
  );
}
