import { runesUtils } from '@/shared/lib/runes-utils';
import { CAT20Balance, TickPriceItem } from '@/shared/types';
import { TickPriceChange, TickUsd } from '@/ui/components/TickUsd';
import { TestIds } from '@/ui/utils/test-ids';

import { Card } from '../Card';
import { Column } from '../Column';
import { Row } from '../Row';
import { RunesTicker } from '../RunesTicker';
import { Text } from '../Text';

export interface CAT20BalanceCardProps {
  tokenBalance: CAT20Balance;
  onClick?: () => void;
  showPrice?: boolean;
  price?: TickPriceItem;
}

export function CAT20BalanceCard(props: CAT20BalanceCardProps) {
  const { tokenBalance, onClick, showPrice, price } = props;
  const balance = runesUtils.toDecimalNumber(tokenBalance.amount, tokenBalance.decimals);
  const str = balance.toString();

  return (
    <Card
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'rgba(var(--color-background-rgb),0.1)',
        borderRadius: 12
      }}
      fullX
      testid={TestIds.CAT20.TOKEN_ITEM}
      data-token-symbol={tokenBalance.symbol}
      data-token-name={tokenBalance.name}
      onClick={() => {
        onClick && onClick();
      }}>
      <Column full py="zero" gap="zero">
        <Row fullY justifyBetween justifyCenter>
          <Column fullY justifyCenter>
            <RunesTicker tick={tokenBalance.name} />
          </Column>

          <Row itemsCenter fullY gap="zero">
            <Text text={str} size="xs" />
            <Text text={tokenBalance.symbol} size="xs" mx="sm" />
          </Row>
        </Row>
        {showPrice && (
          <Row justifyBetween mt={'xs'}>
            <TickPriceChange price={price} />
            <TickUsd price={price} balance={balance.toString()} />
          </Row>
        )}
      </Column>
    </Card>
  );
}
