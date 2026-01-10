import { useI18n } from '@/ui/hooks/useI18n';

import { Row } from '../Row';
import { Text } from '../Text';

export interface AssetTagProps {
  type:  'Unconfirmed' | 'CAT20';
  small?: boolean;
}

const colors = {
  Unconfirmed: 'var(--color-bg-tertiary)',
  CAT20: 'var(--color-bg-tertiary)'
};

export default function AssetTag(props: AssetTagProps) {
  const { type, small } = props;
  const { t } = useI18n();

  const displayText = () => {
    if (type === 'Unconfirmed') {
      return t('unconfirmed');
    }
    return type;
  };

  return (
    <Row
      style={{ backgroundColor: colors[type], borderRadius: small ? 4 : 5 }}
      px={small ? 'sm' : 'md'}
      py={small ? 'zero' : 'xs'}
      itemsCenter>
      <Text text={displayText()} size={small ? 'xxs' : 'xs'} />
    </Row>
  );
}
