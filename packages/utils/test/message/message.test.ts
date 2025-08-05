import { expect } from 'chai';
import { AddressType } from '../../src';
import { verifyMessageOfBIP322Simple, verifyMessageOfECDSA } from '../../src/message';
import { NetworkType } from '../../src/network';
import { LocalWallet } from '../../src/wallet';
import { expectThrowError } from '../utils';

describe('verifyMessage', function () {
  it('ecdsa', async function () {
    const message = 'hello world~';
    const wallet = LocalWallet.fromRandom();
    const signature = await wallet.signMessage(message, 'ecdsa');
    const pubkey = await wallet.getPublicKey();
    const result = await verifyMessageOfECDSA(pubkey, message, signature);
    expect(result).eq(true);

    const errorResult = await verifyMessageOfECDSA(
      pubkey,
      message,
      'G6nd7IqQaU8kxNbUDCnGLf+lA5ZxJ9TVlNOoNSuQ6j1yD1lG/Y25h01yT7SNxW56IuGNRX8Eu4baQYzhU78Wa0o='
    );
    expect(errorResult).eq(false);
  });

  it('bip322-simple for P2PKH', async function () {
    const message = 'hello world~';
    const wallet = LocalWallet.fromRandom(AddressType.P2PKH);
    await expectThrowError(() => wallet.signMessage(message, 'bip322-simple'), 'Not support address type to sign');
  });

});
