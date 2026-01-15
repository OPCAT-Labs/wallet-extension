import { useEffect, useState } from 'react';

import { useI18n } from '@/ui/hooks/useI18n';
import { useChainType } from '@/ui/state/settings/hooks';
import { colors } from '@/ui/theme/colors';
import { useWallet } from '@/ui/utils';

import { Card } from '../Card';
import { Column } from '../Column';
import { Icon } from '../Icon';
import { Popover } from '../Popover';
import { Row } from '../Row';
import { Text } from '../Text';

enum FeeRateType {
  // SLOW,
  // AVG,
  FAST,
  CUSTOM
}

// const FEE_TITLES = ['low_priority', 'medium_priority', 'high_priority'];
const FEE_TITLES = ['current_fee_rate'];

interface FeeOption {
  title: string;
  desc?: string;
  feeRate: number;
}
export function FeeRateIcon() {
  const wallet = useWallet();
  const [feeOptions, setFeeOptions] = useState<FeeOption[]>([]);

  const [feeOptionVisible, setFeeOptionVisible] = useState(false);

  const chainType = useChainType();
  useEffect(() => {
    wallet.getFeeSummary().then((v) => {
      setFeeOptions(v.list);
    });
  }, [chainType]);

  const feeRate = feeOptions[FeeRateType.FAST] ? feeOptions[FeeRateType.FAST].feeRate : 0;

  let color = 'textDim';
  if (feeRate > 100) {
    color = 'red';
  } else if (feeRate > 20) {
    color = 'yellow';
  } else if (feeRate > 0) {
    color = 'green';
  }
  return (
    <Card
      preset="style2"
      style={{
        backgroundColor: 'rgba(var(--color-background-rgb),0.08)',
        height: 28,
        borderRadius: 8,
        padding: '2px 4px',
        gap: 2
      }}>
      <Row
        onClick={() => {
          setFeeOptionVisible(true);
        }}>
        <Icon icon="gas" />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Text text={feeRate > 0 ? feeRate : '-'} size="xxs" color={color as any} />
      </Row>

      {feeOptionVisible ? (
        <FeeOptionsPopover
          feeOptions={feeOptions}
          onClose={() => {
            setFeeOptionVisible(false);
          }}
        />
      ) : null}
    </Card>
  );
}

function FeeOptionsPopover({ feeOptions, onClose }: { feeOptions: FeeOption[]; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Popover onClose={onClose}>
      <Column>
        <Row style={{ borderBottomWidth: 1, borderColor: colors.border, marginBottom: 10, paddingBottom: 10 }}>
          <Text text={t('network_fee_2')} preset="bold" />
        </Row>
          <Card
            mb="sm"
            preset="style1"
            itemsCenter
            style={{
              height: 50,
              minHeight: 50,
              backgroundColor: 'rgba(var(--color-background-rgb),0.04)',
              borderBottomColor: colors.transparent,
              borderBottomWidth: 0.2
            }}>
            <Row justifyBetween full itemsCenter>
              <Column>
                <Text color={'textDim'} size="sm" text={t(FEE_TITLES[0])}></Text>
              </Column>

              <Row>
                <Text color={'white'} size="sm" text={feeOptions[0].feeRate}></Text>
                <Text color={'textDim'} size="sm" text="sats/byte"></Text>
              </Row>
            </Row>
          </Card>
      </Column>
    </Popover>
  );
}
