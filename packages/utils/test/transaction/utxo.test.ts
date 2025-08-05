import { expect } from 'chai';
import { AddressType, UnspentOutput } from '../../src';
import { NetworkType } from '../../src/network';
import { utxoHelper } from '../../src/transaction/utxo';
import { LocalWallet } from '../../src/wallet';

describe('utxo', () => {


  beforeEach(() => {
    // todo
  });
  it('getUtxoDust', function () {

    expect(utxoHelper.getUtxoDust(AddressType.P2PKH)).to.eq(546);
  });

  const networks = [
    NetworkType.MAINNET,
    NetworkType.TESTNET
    // NetworkType.REGTEST, not support
  ];
  const networkNames = ['MAINNET', 'TESTNET', 'REGTEST'];
  networks.forEach((networkType) => {
    describe('getAddressUtxoDust networkType: ' + networkNames[networkType], function () {

      it('should return dust for P2PKH', function () {
        expect(
          utxoHelper.getAddressUtxoDust(LocalWallet.fromRandom(AddressType.P2PKH, networkType).address, networkType)
        ).to.eq(546);
      });
    });
  });
});
