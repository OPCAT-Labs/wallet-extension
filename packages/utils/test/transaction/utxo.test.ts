import { AddressType } from '../../src';
import { BITCOIN_UTXO_DUST, ChainType, OPCAT_UTXO_DUST } from '../../src/constants';
import { NetworkType } from '../../src/network';
import { utxoHelper } from '../../src/transaction/utxo';
import { LocalWallet } from '../../src/wallet';
import { expect } from 'chai';

describe('utxo', () => {
  beforeEach(() => {
    // todo
  });
  it('getUtxoDust', function () {
    expect(utxoHelper.getUtxoDust(AddressType.P2PKH)).to.eq(BITCOIN_UTXO_DUST);
    expect(utxoHelper.getUtxoDust(AddressType.P2PKH, ChainType.OPCAT)).to.eq(OPCAT_UTXO_DUST);
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
        ).to.eq(BITCOIN_UTXO_DUST);
      });

      it('should return OPCAT dust for P2PKH when requested', function () {
        expect(
          utxoHelper.getAddressUtxoDust(
            LocalWallet.fromRandom(AddressType.P2PKH, networkType).address,
            networkType,
            ChainType.OPCAT
          )
        ).to.eq(OPCAT_UTXO_DUST);
      });
    });
  });
});
