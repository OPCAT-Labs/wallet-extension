import { ChainType } from '@/shared/constant';
import { Text } from '@/ui/components';
import { useBTCUnit, useChainType } from '@/ui/state/settings/hooks';

// todo delete this file

export function BtcDisplay({ balance }: { balance: string }) {
  const chainType = useChainType();
  const btcUnit = useBTCUnit();

  const isBTCChain =
    chainType === ChainType.OPCAT_MAINNET ||
    chainType === ChainType.OPCAT_TESTNET;

  return (
    <Text
      text={balance + ' ' + btcUnit}
      preset="title-bold"
      textCenter
      size="xxxl"
      my="sm"
      color={isBTCChain ? 'white' : undefined}
    />
  );
}
