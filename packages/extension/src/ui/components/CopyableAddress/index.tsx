import { useI18n } from '@/ui/hooks/useI18n';
import { copyToClipboard, shortAddress } from '@/ui/utils';

import { useTools } from '../ActionComponent';
import { Icon } from '../Icon';
import { Row } from '../Row';
import { Text } from '../Text';

export function CopyableAddress({ address, testid }: { address: string; testid?: string }) {
  const tools = useTools();
  const { t } = useI18n();
  return (
    <Row
      itemsCenter
      gap="sm"
      clickable
      testid={testid}
      data-address={address}
      onClick={() => {
        copyToClipboard(address).then(() => {
          tools.toastSuccess(t('copied'));
        });
      }}>
      <Icon icon="copy" color="textDim" />
      <Text text={shortAddress(address)} color="textDim" />
    </Row>
  );
}
