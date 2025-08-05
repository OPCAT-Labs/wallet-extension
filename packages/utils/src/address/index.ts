import { bitcoin } from '../bitcoin-core';
import { NetworkType, toPsbtNetwork } from '../network';
import { AddressType } from '../types';

/**
 * Convert public key to bitcoin payment object.
 */
export function publicKeyToPayment(publicKey: string, type: AddressType, networkType: NetworkType) {
  const network = toPsbtNetwork(networkType);
  if (!publicKey) return null;
  const pubkey = Buffer.from(publicKey, 'hex');
  if (type === AddressType.P2PKH) {
    return bitcoin.payments.p2pkh({
      pubkey,
      network
    });
  }
}

/**
 * Convert public key to bitcoin address.
 */
export function publicKeyToAddress(publicKey: string, type: AddressType, networkType: NetworkType) {
  const payment = publicKeyToPayment(publicKey, type, networkType);
  if (payment && payment.address) {
    return payment.address;
  } else {
    return '';
  }
}

/**
 * Convert public key to bitcoin scriptPk.
 */
export function publicKeyToScriptPk(publicKey: string, type: AddressType, networkType: NetworkType) {
  const payment = publicKeyToPayment(publicKey, type, networkType);
  return payment.output.toString('hex');
}

/**
 * Convert bitcoin address to scriptPk.
 */
export function addressToScriptPk(address: string, networkType: NetworkType) {
  const network = toPsbtNetwork(networkType);
  return bitcoin.address.toOutputScript(address, network);
}

/**
 * Check if the address is valid.
 */
export function isValidAddress(address: string, networkType: NetworkType = NetworkType.MAINNET) {
  let error;
  try {
    bitcoin.address.toOutputScript(address, toPsbtNetwork(networkType));
  } catch (e) {
    error = e;
  }
  return !error;
}

export function decodeAddress(address: string) {
  const mainnet = bitcoin.networks.bitcoin;
  const testnet = bitcoin.networks.testnet;
  const regtest = bitcoin.networks.regtest;
  let decodeBase58: bitcoin.address.Base58CheckResult;
  let decodeBech32: bitcoin.address.Bech32Result;
  let networkType: NetworkType;
  let addressType: AddressType;
  if (address.startsWith('bc1') || address.startsWith('tb1') || address.startsWith('bcrt1')) {
    try {
      decodeBech32 = bitcoin.address.fromBech32(address);
      if (decodeBech32.prefix === mainnet.bech32) {
        networkType = NetworkType.MAINNET;
      } else if (decodeBech32.prefix === testnet.bech32) {
        networkType = NetworkType.TESTNET;
      } else if (decodeBech32.prefix === regtest.bech32) {
        networkType = NetworkType.REGTEST;
      }
      return {
        networkType,
        addressType,
        dust: getAddressTypeDust(addressType)
      };
    } catch (e) {}
  } else {
    try {
      decodeBase58 = bitcoin.address.fromBase58Check(address);
      if (decodeBase58.version === mainnet.pubKeyHash) {
        networkType = NetworkType.MAINNET;
        addressType = AddressType.P2PKH;
      } else if (decodeBase58.version === testnet.pubKeyHash) {
        networkType = NetworkType.TESTNET;
        addressType = AddressType.P2PKH;
      } else if (decodeBase58.version === regtest.pubKeyHash) {
        // do not work
        networkType = NetworkType.REGTEST;
        addressType = AddressType.P2PKH;
      } 
      return {
        networkType,
        addressType,
        dust: getAddressTypeDust(addressType)
      };
    } catch (e) {}
  }

  return {
    networkType: NetworkType.MAINNET,
    addressType: AddressType.UNKNOWN,
    dust: 546
  };
}

function getAddressTypeDust(addressType: AddressType) {
  return 546;
}

/**
 * Get address type.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAddressType(address: string, networkType: NetworkType = NetworkType.MAINNET): AddressType {
  return decodeAddress(address).addressType;
}

/**
 * Convert scriptPk to address.
 */
export function scriptPkToAddress(scriptPk: string | Buffer, networkType: NetworkType = NetworkType.MAINNET) {
  const network = toPsbtNetwork(networkType);
  try {
    const address = bitcoin.address.fromOutputScript(
      typeof scriptPk === 'string' ? Buffer.from(scriptPk, 'hex') : scriptPk,
      network
    );
    return address;
  } catch (e) {
    return '';
  }
}
