import { ReactEventHandler } from 'react';

import { AddressAssets } from '@/shared/types';
import { useBTCUnit, useChain } from '@/ui/state/settings/hooks';
import { fontSizes } from '@/ui/theme/font';
import { satoshisToBTC } from '@/ui/utils';

import { Card } from '../Card';
import { Column } from '../Column';
import { CopyableAddress } from '../CopyableAddress';
import { Icon } from '../Icon';
import { Image } from '../Image';
import { Row } from '../Row';
import { Text } from '../Text';

interface AddressTypeCardProps {
  label: string;
  address: string;
  checked: boolean;
  assets: AddressAssets;
  onClick?: ReactEventHandler<HTMLDivElement>;
  addressCopyTestid?: string;
}
export function AddressTypeCard(props: AddressTypeCardProps) {
  const btcUnit = useBTCUnit();
  const { onClick, label, address, checked, assets, addressCopyTestid } = props;
  const hasVault = Boolean(assets.satoshis && assets.satoshis > 0);

  const chain = useChain();
  return (
    <Card px="zero" py="zero" gap="zero" rounded onClick={onClick}>
      <Column full>
        <Row justifyBetween px="md" pt="md">
          <Column justifyCenter>
            <Text text={label} size="xs" disableTranslate />
          </Column>
        </Row>
        <Row justifyBetween px="md" pb="md">
          <CopyableAddress address={address} testid={addressCopyTestid} />
          <Column justifyCenter>{checked && <Icon icon="check" />}</Column>
        </Row>
        {hasVault && (
          <Row justifyBetween bg="bg3" roundedBottom px="md" py="md">
            <Row justifyCenter>
              <Image src={chain.icon} size={fontSizes.iconMiddle} />
              <Text text={`${assets.total_btc} ${btcUnit}`} color="primary" />
            </Row>
          </Row>
        )}
      </Column>
    </Card>
  );
}

interface AddressTypeCardProp2 {
  label: string;
  items: {
    address: string;
    path: string;
    satoshis: number;
  }[];
  checked: boolean;
  onClick?: ReactEventHandler<HTMLDivElement>;
  testid?: string;
}

export function AddressTypeCard2(props: AddressTypeCardProp2) {
  const btcUnit = useBTCUnit();
  const { onClick, label, items, checked, testid } = props;
  return (
    <Card px="zero" py="zero" gap="zero" rounded onClick={onClick} testid={testid}>
      <Column full>
        <Row justifyBetween px="md" pt="md">
          <Column justifyCenter>
            <Text text={label} size="xs" disableTranslate />
          </Column>
          <Column justifyCenter>{checked && <Icon icon="check" />}</Column>
        </Row>

        {items.map((v) => (
          <Row px="md" pb="sm" key={v.address} itemsCenter>
            <Row style={{ width: '120px' }}>
              <CopyableAddress address={v.address} />
            </Row>

            <Text text={`(${v.path})`} size="xs" color="textDim" disableTranslate />

            {v.satoshis > 0 && (
              <Row justifyCenter gap="zero" itemsCenter>
                <Icon icon="btc" size={fontSizes.iconMiddle} />
                <Text text={`${satoshisToBTC(v.satoshis)} ${btcUnit}`} color="primary" size="xxxs" />
              </Row>
            )}
          </Row>
        ))}
      </Column>
    </Card>
  );
}
