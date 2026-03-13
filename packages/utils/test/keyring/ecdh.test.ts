import { expect } from 'chai';
import * as noble_secp256k1 from '@noble/secp256k1';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { SimpleKeyring } from '../../src/keyring';

const testAccount = {
  key: '88544d58a328a380a4a433e4bb44b2a9f8a1152b1467393cfc8f8e5d81137162',
  address: '02b57a152325231723ee9faabba930108b19c11a391751572f380d71b447317ae7'
};

describe('ECDH', () => {
  describe('#computeECDH', () => {
    it('should compute shared secret with external public key', async () => {
      const keyring = new SimpleKeyring([testAccount.key]);
      const accounts = await keyring.getAccounts();
      const walletPubkey = accounts[0];

      // Generate external key pair
      const externalPrivKey = noble_secp256k1.utils.randomPrivateKey();
      const externalPubKey = noble_secp256k1.getPublicKey(externalPrivKey, true); // compressed

      const result = await keyring.computeECDH(walletPubkey, Buffer.from(externalPubKey).toString('hex'));

      expect(result.sharedSecret).to.be.a('string');
      expect(result.sharedSecret).to.have.lengthOf(64); // 32 bytes hex
      expect(result.ecdhPubKey).to.eq(walletPubkey);
    });

    it('should produce same shared secret from both sides', async () => {
      // Create two keyrings (Alice and Bob)
      const aliceKeyring = new SimpleKeyring([testAccount.key]);
      const aliceAccounts = await aliceKeyring.getAccounts();
      const alicePubkey = aliceAccounts[0];

      const bobPrivKey = noble_secp256k1.utils.randomPrivateKey();
      const bobPubKey = noble_secp256k1.getPublicKey(bobPrivKey, true);

      // Alice computes shared secret with Bob's public key
      const aliceResult = await aliceKeyring.computeECDH(alicePubkey, Buffer.from(bobPubKey).toString('hex'));

      // Bob computes shared secret with Alice's public key
      const sharedPointBob = noble_secp256k1.getSharedSecret(bobPrivKey, Buffer.from(alicePubkey, 'hex'));
      const bobSharedSecret = Buffer.from(nobleSha256(sharedPointBob.slice(1))).toString('hex');

      // Both should have the same shared secret
      expect(aliceResult.sharedSecret).to.eq(bobSharedSecret);
    });

    it('should work with uncompressed public key', async () => {
      const keyring = new SimpleKeyring([testAccount.key]);
      const accounts = await keyring.getAccounts();
      const walletPubkey = accounts[0];

      // Generate external key pair with uncompressed public key
      const externalPrivKey = noble_secp256k1.utils.randomPrivateKey();
      const externalPubKey = noble_secp256k1.getPublicKey(externalPrivKey, false); // uncompressed (65 bytes)

      const result = await keyring.computeECDH(walletPubkey, Buffer.from(externalPubKey).toString('hex'));

      expect(result.sharedSecret).to.be.a('string');
      expect(result.sharedSecret).to.have.lengthOf(64);
    });

    it('should throw error for invalid public key format', async () => {
      const keyring = new SimpleKeyring([testAccount.key]);
      const accounts = await keyring.getAccounts();
      const walletPubkey = accounts[0];

      // Invalid public key (wrong length)
      const invalidPubKey = 'abcd1234';

      let error: Error | null = null;
      try {
        await keyring.computeECDH(walletPubkey, invalidPubKey);
      } catch (e) {
        error = e as Error;
      }

      expect(error).to.not.be.null;
      expect(error!.message).to.include('Invalid external public key format');
    });

    it('should throw error for non-existent wallet public key', async () => {
      const keyring = new SimpleKeyring([testAccount.key]);

      const externalPrivKey = noble_secp256k1.utils.randomPrivateKey();
      const externalPubKey = noble_secp256k1.getPublicKey(externalPrivKey, true);

      // Non-existent wallet public key
      const nonExistentPubkey = '03' + '0'.repeat(64);

      let error: Error | null = null;
      try {
        await keyring.computeECDH(nonExistentPubkey, Buffer.from(externalPubKey).toString('hex'));
      } catch (e) {
        error = e as Error;
      }

      expect(error).to.not.be.null;
      expect(error!.message).to.include('Unable to find');
    });

    it('should produce different shared secrets for different external keys', async () => {
      const keyring = new SimpleKeyring([testAccount.key]);
      const accounts = await keyring.getAccounts();
      const walletPubkey = accounts[0];

      // Generate two different external key pairs
      const externalPrivKey1 = noble_secp256k1.utils.randomPrivateKey();
      const externalPubKey1 = noble_secp256k1.getPublicKey(externalPrivKey1, true);

      const externalPrivKey2 = noble_secp256k1.utils.randomPrivateKey();
      const externalPubKey2 = noble_secp256k1.getPublicKey(externalPrivKey2, true);

      const result1 = await keyring.computeECDH(walletPubkey, Buffer.from(externalPubKey1).toString('hex'));
      const result2 = await keyring.computeECDH(walletPubkey, Buffer.from(externalPubKey2).toString('hex'));

      expect(result1.sharedSecret).to.not.eq(result2.sharedSecret);
    });
  });
});
