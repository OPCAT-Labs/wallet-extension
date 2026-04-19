import { decodeAddress } from '../address';
import { ChainType, getUtxoDustThreshold } from '../constants';
import { NetworkType } from '../network';
import { AddressType, UnspentOutput } from '../types';

function hasAnyAssets(utxos: UnspentOutput[]) {
  void utxos;
  return false;
}

/**
 * select utxos so that the total amount of utxos is greater than or equal to targetAmount
 * return the selected utxos and the unselected utxos
 * @param utxos
 * @param targetAmount
 */
function selectBtcUtxos(utxos: UnspentOutput[], targetAmount: number) {
  let selectedUtxos: UnspentOutput[] = [];
  let remainingUtxos: UnspentOutput[] = [];

  let totalAmount = 0;
  for (const utxo of utxos) {
    if (totalAmount < targetAmount) {
      totalAmount += utxo.satoshis;
      selectedUtxos.push(utxo);
    } else {
      remainingUtxos.push(utxo);
    }
  }

  return {
    selectedUtxos,
    remainingUtxos
  };
}

/**
 * return the added virtual size of the utxo
 */
function getAddedVirtualSize(addressType: AddressType) {
  if (addressType === AddressType.P2PKH) {
    return 41 + 1 + 1 + 72 + 1 + 33;
  }
  throw new Error('unknown address type');
}

export function getUtxoDust(addressType: AddressType, chainType: ChainType = ChainType.BITCOIN) {
  if (addressType === AddressType.P2PKH) {
    return getUtxoDustThreshold(chainType);
  }
  return getUtxoDustThreshold(chainType);
}

// deprecated
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAddressUtxoDust(
  address: string,
  networkType: NetworkType = NetworkType.MAINNET,
  chainType: ChainType = ChainType.BITCOIN
) {
  void networkType;
  return decodeAddress(address, chainType).dust;
}

export const utxoHelper = {
  hasAnyAssets,
  selectBtcUtxos,
  getAddedVirtualSize,
  getUtxoDust,
  getAddressUtxoDust
};
