import { useCallback, useEffect, useState } from 'react';

import { Card, Column, Content, Header, Icon, Layout, Row, Text } from '@/ui/components';
import { useI18n } from '@/ui/hooks/useI18n';
import { applyTheme, getStoredTheme, ThemeType } from '@/ui/utils/theme';

interface ThemeOption {
  key: ThemeType;
  label: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' }
];

export default function ThemeScreen() {
  const { t } = useI18n();
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>(getStoredTheme());

  useEffect(() => {
    // Apply theme on mount
    applyTheme(selectedTheme);
  }, []);

  const handleThemeSelect = useCallback((theme: ThemeType) => {
    if (theme === selectedTheme) return;
    setSelectedTheme(theme);
    applyTheme(theme);
    window.history.go(-1);
  }, [selectedTheme]);

  return (
    <Layout>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}
        title={t('theme')}
      />
      <Content>
        <Column
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 16,
            paddingBottom: 16
          }}>
          <Card
            style={{
              width: '328px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              padding: 0
            }}>
            <div
              style={{
                width: '100%',
                overflow: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}>
              <Column fullX>
                {THEME_OPTIONS.map((option, index) => (
                  <Column key={option.key} fullX>
                    {index > 0 && <Row style={{ height: 1, backgroundColor: 'rgba(0, 0, 0, 0.08)' }} />}
                    <Row
                      onClick={() => handleThemeSelect(option.key)}
                      itemsCenter
                      justifyBetween
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        minHeight: '34px'
                      }}
                      full>
                      <Text
                        color={option.key === selectedTheme ? 'text' : 'textDim'}
                        size="sm"
                        text={t(option.key === 'light' ? 'theme_light' : 'theme_dark')}
                      />
                      {option.key === selectedTheme && <Icon icon="checked" color="primary" size={20} />}
                    </Row>
                  </Column>
                ))}
              </Column>
            </div>
          </Card>
        </Column>
      </Content>
    </Layout>
  );
}
