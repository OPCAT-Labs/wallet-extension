import { useMemo, useState } from 'react';

import { shortAddress } from '@/ui/utils';

import { AddressDetailPopover } from '../AddressDetailPopover';
import { Column } from '../Column';
import { Text } from '../Text';
import { AddressTextProps } from './interface';

export const AddressText = (props: AddressTextProps) => {
  const [popoverVisible, setPopoverVisible] = useState(false);
  const address = useMemo(() => {
    if (props.address) {
      return props.address;
    }
    if (props.addressInfo) {
      return props.addressInfo.address;
    }
    return '';
  }, []);

  return (
    <Column>
      <Column
        onClick={() => {
          setPopoverVisible(true);
        }}>
        <Text text={shortAddress(address)} color={props.color || 'white'} />
      </Column>
      {popoverVisible && (
        <AddressDetailPopover
          address={address}
          onClose={() => {
            setPopoverVisible(false);
          }}
          // inputInfo={props.inputInfo}
        />
      )}
    </Column>
  );
};
