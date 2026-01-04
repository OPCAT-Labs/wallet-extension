import { useI18n } from '@/ui/hooks/useI18n';
import { useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { copyToClipboard, shortAddress } from '@/ui/utils';
import { TestIds } from '@/ui/utils/test-ids';
import { CopyOutlined } from '@ant-design/icons';

import { useTools } from '../ActionComponent';
import { Column } from '../Column';
import { Icon } from '../Icon';
import { Row } from '../Row';
import { Text } from '../Text';
import './index.less';

const AccountSelect = () => {
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const tools = useTools();
  const address = currentAccount.address;
  const { t } = useI18n();

  return (
    <Row
      justifyBetween
      px="md"
      py="md"
      bg="card"
      itemsCenter
      testid={TestIds.ACCOUNT_SELECT.CONTAINER}
      style={{
        borderRadius: 8
      }}>
      <Row style={{ flex: 1 }}>
        <Icon size={15} icon="user" style={{ marginLeft: 10 }} />
      </Row>

      <Column
        justifyCenter
        rounded
        px="sm"
        style={{
          flex: 1
        }}
        testid={TestIds.ACCOUNT_SELECT.COPY_ADDRESS_BUTTON}
        onClick={() => {
          copyToClipboard(address).then(() => {
            tools.toastSuccess(t('copied'));
          });
        }}>
        <Text text={shortAddress(currentAccount?.alianName, 8)} textCenter ellipsis />
        <Row selfItemsCenter itemsCenter testid={TestIds.ACCOUNT_SELECT.ADDRESS_DISPLAY} data-address={address}>
          <Text text={shortAddress(address)} color="textDim" />
          <CopyOutlined style={{ color: '#888', fontSize: 14 }} />
        </Row>
      </Column>

      <Row
        style={{ flex: 1 }}
        fullY
        py="md"
        justifyEnd
        itemsCenter
        testid={TestIds.ACCOUNT_SELECT.SWITCH_ACCOUNT_BUTTON}
        onClick={() => {
          navigate('SwitchAccountScreen');
        }}>
        <Icon size={15} icon="right" style={{ marginRight: 10 }} />
      </Row>
    </Row>
  );
};

export default AccountSelect;
