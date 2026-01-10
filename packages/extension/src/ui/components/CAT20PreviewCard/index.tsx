import { runesUtils } from '@/shared/lib/runes-utils';
import { CAT20Balance, TickPriceItem } from '@/shared/types';
import { Column } from '../Column';
import { Row } from '../Row';
import { TickUsd } from '../TickUsd';
import { Text } from '../Text';



export interface CAT20PreviewCardProps {
  balance: CAT20Balance;
  onClick?: () => void;
  price: TickPriceItem | undefined;
}

export default function CAT20PreviewCard({ balance, onClick, price }: CAT20PreviewCardProps) {
  const balanceStr = `${runesUtils.toDecimalAmount(balance.amount, balance.decimals)} ${balance.symbol}`;

  let size = 'sm';
  if (balanceStr.length > 10) {
    size = 'xxs';
  } else if (balanceStr.length > 20) {
    size = 'xxxs';
  }

  return (
    <Column
      style={{
        position: 'relative',
        backgroundColor: 'rgba(var(--color-primary-rgb), 0.7)',
        width: 80,
        height: 90,
        minWidth: 80,
        minHeight: 90,
        borderRadius: 5,
        padding: 0
      }}
      onClick={onClick}
    >
      <Row
        style={{
          borderTopLeftRadius: 5,
          borderTopRightRadius: 5,
          position: 'absolute'
        }}
      >
        <Row
          style={{
            backgroundColor: 'rgba(var(--color-background-rgb),0.2)',
            borderBottomRightRadius: 5,
            borderTopLeftRadius: 5,
            width: 70
          }}
          px="sm"
        >
          <Text text={balance.symbol} wrap color="white" size="xxxs" />
        </Row>
      </Row>

      <Column fullY justifyCenter itemsCenter gap={'xs'}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Text text={balanceStr} size={size as any} textCenter wrap />
        <TickUsd
          style={{ marginBottom: -16 }}
          price={price}
          balance={runesUtils.toDecimalAmount(balance.amount, balance.decimals)}
        />
      </Column>
    </Column>
  )
}