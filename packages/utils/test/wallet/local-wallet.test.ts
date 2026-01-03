import { expect } from 'chai';
import { AddressType } from '../../src';
import { NetworkType } from '../../src/network';
import { LocalWallet } from '../../src/wallet';

const sampleMnemonic = 'finish oppose decorate face calm tragic certain desk hour urge dinosaur mango';

describe('local-wallet', () => {
  describe('new a wallet', function () {
    // Tests for removed address types (P2TR, P2WPKH) have been deleted
    // OpCat only supports P2PKH
  });
});
