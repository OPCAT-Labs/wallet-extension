
import { DecodedPsbt} from '@/shared/types';
import { useI18n } from '@/ui/hooks/useI18n';
import { colors } from '@/ui/theme/colors';

import { Column } from '../Column';
import { Icon } from '../Icon';
import { Popover } from '../Popover';
import { Row } from '../Row';
import { Text } from '../Text';

export const SendingOutAssets = ({ onClose }: { decodedPsbt: DecodedPsbt; onClose: () => void }) => {
  const { t } = useI18n();

  return (
    <Popover>
      <Column justifyCenter itemsCenter>
        <Row fullX justifyBetween>
          <Row />
          <Text text={t('sending_out_assets')} preset="bold" />
          <Icon
            icon="close"
            onClick={() => {
              onClose();
            }}
          />
        </Row>

        <Row fullX style={{ borderBottomWidth: 1, borderColor: colors.border }} />
      </Column>
    </Popover>
  );
};
