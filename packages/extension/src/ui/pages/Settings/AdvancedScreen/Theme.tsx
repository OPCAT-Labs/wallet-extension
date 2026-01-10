import { useNavigate } from 'react-router-dom';

import { Card, Icon, Row, Text } from '@/ui/components';
import { useI18n } from '@/ui/hooks/useI18n';
import { fontSizes } from '@/ui/theme/font';
import { getStoredTheme } from '@/ui/utils/theme';

export function ThemeCard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const currentTheme = getStoredTheme();
  const currentThemeName = t(currentTheme === 'light' ? 'theme_light' : 'theme_dark');

  return (
    <Card style={{ borderRadius: 10, cursor: 'pointer' }} onClick={() => navigate('/settings/theme')}>
      <Row full justifyBetween>
        <Text text={t('theme')} preset="bold" size="sm" />
        <Row itemsCenter gap="xs">
          <Text text={currentThemeName} size="sm" color="textDim" />
          <Icon icon="right" size={fontSizes.lg} color="textDim" />
        </Row>
      </Row>
    </Card>
  );
}
