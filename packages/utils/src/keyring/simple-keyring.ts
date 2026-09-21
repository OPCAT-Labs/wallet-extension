import { decode } from 'bs58check';
import { EventEmitter } from 'events';
import * as noble_secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { ECPair, ECPairInterface, bitcoin } from '../bitcoin-core';
import { signMessageOfDeterministicECDSA, verifyMessageOfECDSA } from '../message';
import { ToSignInput } from '../types';
import { wrapSigner } from '../opcatSigner';

const type = 'Simple Key Pair';

export class SimpleKeyring extends EventEmitter {
  static type = type;
  type = type;
  network: bitcoin.Network = bitcoin.networks.bitcoin;
  wallets: ECPairInterface[] = [];
  constructor(opts?: any) {
    super();
    if (opts) {
      this.deserialize(opts);
    }
  }

  async serialize(): Promise<any> {
    return this.wallets.map((wallet) => wallet.privateKey.toString('hex'));
  }

  async deserialize(opts: any) {
    const privateKeys = opts as string[];

    this.wallets = privateKeys.map((key) => {
      let buf: Buffer;
      if (key.length === 64) {
        // privateKey
        buf = Buffer.from(key, 'hex');
      } else {
        // base58
        buf = decode(key).slice(1, 33);
      }

      return ECPair.fromPrivateKey(buf);
    });
  }

  async addAccounts(n = 1) {
    const newWallets: ECPairInterface[] = [];
    for (let i = 0; i < n; i++) {
      newWallets.push(ECPair.makeRandom());
    }
    this.wallets = this.wallets.concat(newWallets);
    const hexWallets = newWallets.map(({ publicKey }) => publicKey.toString('hex'));
    return hexWallets;
  }

  async getAccounts() {
    return this.wallets.map(({ publicKey }) => publicKey.toString('hex'));
  }

  async signTransaction(psbt: bitcoin.Psbt, inputs: ToSignInput[], opts?: any) {
    inputs.forEach((input) => {
      const keyPair = this._getPrivateKeyFor(input.publicKey);
      // OpCat only uses P2PKH with ECDSA signatures
      psbt.signInput(input.index, wrapSigner(keyPair as any, psbt), input.sighashTypes);
    });
    return psbt;
  }

  async signMessage(publicKey: string, text: string) {
    const keyPair = this._getPrivateKeyFor(publicKey);
    return signMessageOfDeterministicECDSA(keyPair, text);
  }

  async verifyMessage(publicKey: string, text: string, sig: string) {
    return verifyMessageOfECDSA(publicKey, text, sig);
  }

  // Sign any content, but note that the content signed by this method is unreadable, so use it with caution.
  async signData(publicKey: string, data: string, type: 'ecdsa' = 'ecdsa') {
    const keyPair = this._getPrivateKeyFor(publicKey);
    if (type === 'ecdsa') {
      if (!/^[0-9a-fA-F]{64}$/.test(data)) {
        throw new Error('Expected Hash');
      }
      return keyPair.sign(Buffer.from(data, 'hex')).toString('hex');
    }
    throw new Error('Not support type');
  }

  private _getPrivateKeyFor(publicKey: string) {
    if (!publicKey) {
      throw new Error('Must specify publicKey.');
    }
    const wallet = this._getWalletForAccount(publicKey);
    return wallet;
  }

  async exportAccount(publicKey: string) {
    const wallet = this._getWalletForAccount(publicKey);
    return wallet.privateKey.toString('hex');
  }

  removeAccount(publicKey: string) {
    if (!this.wallets.map((wallet) => wallet.publicKey.toString('hex')).includes(publicKey)) {
      throw new Error(`PublicKey ${publicKey} not found in this keyring`);
    }

    this.wallets = this.wallets.filter((wallet) => wallet.publicKey.toString('hex') !== publicKey);
  }

  /**
   * Compute ECDH shared secret with an external public key
   * Uses secp256k1 curve (Bitcoin native) and SHA256 hash
   * @param publicKey - The wallet's public key (hex)
   * @param externalPubKey - The external party's public key (hex, 02/03/04 prefix)
   * @returns Object containing sharedSecret (hex) and ecdhPubKey (hex)
   */
  async computeECDH(publicKey: string, externalPubKey: string): Promise<{
    sharedSecret: string;
    ecdhPubKey: string;
  }> {
    const keyPair = this._getPrivateKeyFor(publicKey);
    const privateKey = keyPair.privateKey;

    if (!privateKey) {
      throw new Error('Private key not available');
    }

    // Validate external public key format
    const externalPubKeyBytes = Buffer.from(externalPubKey, 'hex');
    if (externalPubKeyBytes.length !== 33 && externalPubKeyBytes.length !== 65) {
      throw new Error('Invalid external public key format');
    }

    // Compute ECDH shared point using secp256k1
    const sharedPoint = noble_secp256k1.getSharedSecret(privateKey, externalPubKeyBytes);

    // SHA256 hash of shared point (excluding prefix byte for x-coordinate only)
    const sharedSecret = sha256(sharedPoint.slice(1));

    return {
      sharedSecret: Buffer.from(sharedSecret).toString('hex'),
      ecdhPubKey: keyPair.publicKey.toString('hex'),
    };
  }

  private _getWalletForAccount(publicKey: string) {
    let wallet = this.wallets.find((wallet) => wallet.publicKey.toString('hex') == publicKey);
    if (!wallet) {
      throw new Error('Simple Keyring - Unable to find matching publicKey.');
    }
    return wallet;
  }
}

export function verifySignData(publicKey: string, hash: string, type: 'ecdsa', signature: string) {
  const keyPair = ECPair.fromPublicKey(Buffer.from(publicKey, 'hex'));
  if (type === 'ecdsa') {
    return keyPair.verify(Buffer.from(hash, 'hex'), Buffer.from(signature, 'hex'));
  }
  throw new Error('Not support type');
}
