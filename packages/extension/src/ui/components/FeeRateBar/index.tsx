import { CSSProperties, useEffect, useState } from 'react';
import { colors } from '@/ui/theme/colors';
import { useWallet } from '@/ui/utils';

import { Column } from '../Column';
import { Row } from '../Row';
import { Text } from '../Text';
import { FeeRateType } from './const';

// deprecated
export function FeeRateBar({ readonly, onChange }: { readonly?: boolean; onChange?: (val: number) => void }) {
  const wallet = useWallet();
  const [feeOptions, setFeeOptions] = useState<{ feeRate: number }[]>([]);

  useEffect(() => {
    wallet.getFeeSummary().then((v) => {
      setFeeOptions(v.list);
    });
  }, []);

  const [feeOptionIndex, setFeeOptionIndex] = useState(FeeRateType.FAST);

  useEffect(() => {
    const defaultOption = feeOptions[1];
    const defaultVal = defaultOption ? defaultOption.feeRate : 1;

    let val = defaultVal;
    if (feeOptions.length > 0) {
      val = feeOptions[feeOptionIndex].feeRate;
    }
    onChange && onChange(val);
  }, [feeOptions, feeOptionIndex]);

  return (
    <Column>
      <Row justifyCenter>
        {feeOptions.map((v, index) => {
          let selected = index === feeOptionIndex;
          if (readonly) {
            selected = false;
          }

          return (
            <div
              key={index}
              onClick={() => {
                if (readonly) {
                  return;
                }
                setFeeOptionIndex(index);
              }}
              style={Object.assign(
                {},
                {
                  borderWidth: 1,
                  borderColor: 'rgba(var(--color-text-rgb),0.4)',
                  height: 75,
                  width: 75,
                  textAlign: 'center',
                  padding: 4,
                  borderRadius: 5,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  cursor: 'pointer'
                } as CSSProperties,
                selected ? { backgroundColor: colors.background } : {}
              )}>
              <Text
                text={`${v.feeRate} sats/byte`}
                textCenter
                style={{ color: selected ? colors.text : colors.textDim }}
              />
            </div>
          );
        })}
      </Row>
    </Column>
  );
}
