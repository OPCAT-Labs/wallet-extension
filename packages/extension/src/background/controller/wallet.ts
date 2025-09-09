import {
  contactBookService,
  keyringService,
  notificationService,
  openapiService,
  permissionService,
  preferenceService,
  sessionService
} from '@/background/service';
import { DisplayedKeyring, Keyring } from '@/background/service/keyring';
import {
  ADDRESS_TYPES,
  AddressFlagType,
  AUTO_LOCK_TIMES,
  BRAND_ALIAN_TYPE_TEXT,
  CHAINS_ENUM,
  CHAINS_MAP,
  ChainType,
  COIN_NAME,
  COIN_SYMBOL,
  DEFAULT_LOCKTIME_ID,
  EVENTS,
  KEYRING_TYPE,
  KEYRING_TYPES,
  NETWORK_TYPES
} from '@/shared/constant';
import eventBus from '@/shared/eventBus';
import {
  Account,
  AddressType,
  AddressUserToSignInput,
  BitcoinBalance,
  NetworkType,
  PublicKeyUserToSignInput,
  SignPsbtOptions,
  ToSignInput,
  UTXO,
  WalletKeyring
} from '@/shared/types';
import { getChainInfo } from '@/shared/utils';
import { psbtFromString } from '@/ui/utils/psbt-utils';
import { txHelpers } from '@opcat-labs/wallet-sdk';
import { isValidAddress, publicKeyToAddress, scriptPkToAddress } from '@opcat-labs/wallet-sdk/lib/address';
import { bitcoin, ECPair } from '@opcat-labs/wallet-sdk/lib/bitcoin-core';
import { KeystoneKeyring } from '@opcat-labs/wallet-sdk/lib/keyring';
import {
  genPsbtOfBIP322Simple,
  getSignatureFromPsbtOfBIP322Simple,
  signMessageOfBIP322Simple
} from '@opcat-labs/wallet-sdk/lib/message';
import { toPsbtNetwork } from '@opcat-labs/wallet-sdk/lib/network';
import { toXOnly } from '@opcat-labs/wallet-sdk/lib/utils';

import { ContactBookItem } from '../service/contactBook';
import { OpenApiService } from '../service/openapi';
import { ConnectedSite } from '../service/permission';
import { psbtFromBase64 } from '../utils/psbt';
import BaseController from './base';

const stashKeyrings: Record<string, Keyring> = {};
export type AccountAsset = {
  name: string;
  symbol: string;
  amount: string;
  value: string;
};

export class WalletController extends BaseController {
  openapi: OpenApiService = openapiService;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timer: any = null;

  /* wallet */
  boot = (password: string) => keyringService.boot(password);
  isBooted = () => keyringService.isBooted();

  getApproval = notificationService.getApproval;
  resolveApproval = notificationService.resolveApproval;
  rejectApproval = notificationService.rejectApproval;

  hasVault = () => keyringService.hasVault();
  verifyPassword = (password: string) => keyringService.verifyPassword(password);
  changePassword = (password: string, newPassword: string) => keyringService.changePassword(password, newPassword);

  initAlianNames = async () => {
    preferenceService.changeInitAlianNameStatus();
  };

  isReady = () => {
    if (contactBookService.store) {
      return true;
    } else {
      return false;
    }
  };

  unlock = async (password: string) => {
    const alianNameInited = preferenceService.getInitAlianNameStatus();
    const alianNames = contactBookService.listAlias();
    await keyringService.submitPassword(password);
    sessionService.broadcastEvent('unlock');
    if (!alianNameInited && alianNames.length === 0) {
      this.initAlianNames();
    }

    this._resetTimeout();
  };
  isUnlocked = () => {
    return keyringService.memStore.getState().isUnlocked;
  };

  lockWallet = async () => {
    await keyringService.setLocked();
    sessionService.broadcastEvent('accountsChanged', []);
    sessionService.broadcastEvent('lock');
    eventBus.emit(EVENTS.broadcastToUI, {
      method: 'lock',
      params: {}
    });
  };

  setPopupOpen = (isOpen: boolean) => {
    preferenceService.setPopupOpen(isOpen);
  };

  getAddressBalance = async (address: string) => {
    const data = await openapiService.getAddressBalance(address);
    preferenceService.updateAddressBalance(address, data);
    return data;
  };

  getAddressBalanceV2 = async (address: string) => {
    const data = await openapiService.getAddressBalanceV2(address);
    return data;
  };

  getMultiAddressAssets = async (addresses: string) => {
    return openapiService.getMultiAddressAssets(addresses);
  };

  findGroupAssets = (groups: { type: number; address_arr: string[]; pubkey_arr: string[] }[]) => {
    return openapiService.findGroupAssets(groups);
  };

  getAddressCacheBalance = (address: string | undefined): BitcoinBalance => {
    const defaultBalance: BitcoinBalance = {
      confirm_amount: '0',
      pending_amount: '0',
      amount: '0',
      usd_value: '0',
      confirm_btc_amount: '0',
      pending_btc_amount: '0',
      btc_amount: '0',
    };
    if (!address) return defaultBalance;
    return preferenceService.getAddressBalance(address) || defaultBalance;
  };

  getAddressHistory = async (params: { address: string; start: number; limit: number }) => {
    const data = await openapiService.getAddressRecentHistory(params);
    // preferenceService.updateAddressHistory(address, data);
    // return data;
    //   todo
    return data;
  };

  getAddressCacheHistory = (address: string | undefined) => {
    if (!address) return [];
    return preferenceService.getAddressHistory(address);
  };

  getExternalLinkAck = () => {
    preferenceService.getExternalLinkAck();
  };

  setExternalLinkAck = (ack) => {
    preferenceService.setExternalLinkAck(ack);
  };

  getLocale = () => {
    return preferenceService.getLocale();
  };

  setLocale = (locale: string) => {
    preferenceService.setLocale(locale);
  };

  getCurrency = () => {
    return preferenceService.getCurrency();
  };

  setCurrency = (currency: string) => {
    preferenceService.setCurrency(currency);
  };

  /* keyrings */

  clearKeyrings = () => keyringService.clearKeyrings();

  getPrivateKey = async (password: string, { pubkey, type }: { pubkey: string; type: string }) => {
    await this.verifyPassword(password);
    const keyring = await keyringService.getKeyringForAccount(pubkey, type);
    if (!keyring) return null;
    const privateKey = await keyring.exportAccount(pubkey);
    const networkType = this.getNetworkType();
    const network = toPsbtNetwork(networkType);
    const hex = privateKey;
    const wif = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), { network }).toWIF();
    return {
      hex,
      wif
    };
  };

  getMnemonics = async (password: string, keyring: WalletKeyring) => {
    await this.verifyPassword(password);
    const originKeyring = keyringService.keyrings[keyring.index];
    const serialized = await originKeyring.serialize();
    return {
      mnemonic: serialized.mnemonic,
      hdPath: serialized.hdPath,
      passphrase: serialized.passphrase
    };
  };

  createKeyringWithPrivateKey = async (data: string, addressType: AddressType, _alianName?: string) => {
    let originKeyring: Keyring;
    try {
      originKeyring = await keyringService.importPrivateKey(data, addressType);
    } catch (e) {
      console.log(e);
      throw e;
    }

    const displayedKeyring = await keyringService.displayForKeyring(
      originKeyring,
      addressType,
      keyringService.keyrings.length - 1
    );
    const keyring = this.displayedKeyringToWalletKeyring(displayedKeyring, keyringService.keyrings.length - 1);
    this.changeKeyring(keyring);
  };

  getPreMnemonics = () => keyringService.getPreMnemonics();
  generatePreMnemonic = () => keyringService.generatePreMnemonic();
  removePreMnemonics = () => keyringService.removePreMnemonics();
  createKeyringWithMnemonics = async (
    mnemonic: string,
    hdPath: string,
    passphrase: string,
    addressType: AddressType,
    accountCount: number
  ) => {
    const originKeyring = await keyringService.createKeyringWithMnemonics(
      mnemonic,
      hdPath,
      passphrase,
      addressType,
      accountCount
    );
    keyringService.removePreMnemonics();

    const displayedKeyring = await keyringService.displayForKeyring(
      originKeyring,
      addressType,
      keyringService.keyrings.length - 1
    );
    const keyring = this.displayedKeyringToWalletKeyring(displayedKeyring, keyringService.keyrings.length - 1);
    this.changeKeyring(keyring);
    // preferenceService.setShowSafeNotice(true);
  };

  createTmpKeyringWithMnemonics = async (
    mnemonic: string,
    hdPath: string,
    passphrase: string,
    addressType: AddressType,
    accountCount = 1
  ) => {
    const activeIndexes: number[] = [];
    for (let i = 0; i < accountCount; i++) {
      activeIndexes.push(i);
    }
    const originKeyring = keyringService.createTmpKeyring('HD Key Tree', {
      mnemonic,
      activeIndexes,
      hdPath,
      passphrase
    });
    const displayedKeyring = await keyringService.displayForKeyring(originKeyring, addressType, -1);
    return this.displayedKeyringToWalletKeyring(displayedKeyring, -1, false);
  };

  createTmpKeyringWithPrivateKey = async (privateKey: string, addressType: AddressType) => {
    const originKeyring = keyringService.createTmpKeyring(KEYRING_TYPE.SimpleKeyring, [privateKey]);
    const displayedKeyring = await keyringService.displayForKeyring(originKeyring, addressType, -1);
    // preferenceService.setShowSafeNotice(true);
    return this.displayedKeyringToWalletKeyring(displayedKeyring, -1, false);
  };

  createTmpKeyringWithKeystone = async (
    urType: string,
    urCbor: string,
    addressType: AddressType,
    hdPath: string,
    accountCount: number
  ) => {
    const tmpKeyring = new KeystoneKeyring();
    await tmpKeyring.initFromUR(urType, urCbor);
    if (hdPath.length >= 13) {
      tmpKeyring.changeChangeAddressHdPath(hdPath);
      tmpKeyring.addAccounts(accountCount);
    } else {
      tmpKeyring.changeHdPath(ADDRESS_TYPES[addressType].hdPath);
      accountCount && tmpKeyring.addAccounts(accountCount);
    }

    const opts = await tmpKeyring.serialize();
    const originKeyring = keyringService.createTmpKeyring(KEYRING_TYPE.KeystoneKeyring, opts);
    const displayedKeyring = await keyringService.displayForKeyring(originKeyring, addressType, -1);
    preferenceService.setShowSafeNotice(false);
    return this.displayedKeyringToWalletKeyring(displayedKeyring, -1, false);
  };

  createKeyringWithKeystone = async (
    urType: string,
    urCbor: string,
    addressType: AddressType,
    hdPath: string,
    accountCount = 1,
    filterPubkey: string[] = [],
    connectionType: 'USB' | 'QR' = 'USB'
  ) => {
    const originKeyring = await keyringService.createKeyringWithKeystone(
      urType,
      urCbor,
      addressType,
      hdPath,
      accountCount,
      connectionType
    );

    if (filterPubkey !== null && filterPubkey !== undefined && filterPubkey.length > 0) {
      const accounts = await originKeyring.getAccounts();
      accounts.forEach((account) => {
        if (!filterPubkey.includes(account)) {
          originKeyring.removeAccount(account);
        }
      });
    }
    const displayedKeyring = await keyringService.displayForKeyring(
      originKeyring,
      addressType,
      keyringService.keyrings.length - 1
    );
    const keyring = this.displayedKeyringToWalletKeyring(displayedKeyring, keyringService.keyrings.length - 1);
    this.changeKeyring(keyring);
    preferenceService.setShowSafeNotice(false);
  };

  removeKeyring = async (keyring: WalletKeyring) => {
    await keyringService.removeKeyring(keyring.index);
    const keyrings = await this.getKeyrings();
    const nextKeyring = keyrings[keyrings.length - 1];
    if (nextKeyring && nextKeyring.accounts[0]) {
      this.changeKeyring(nextKeyring);
      return nextKeyring;
    }
  };

  getKeyringByType = (type: string) => {
    return keyringService.getKeyringByType(type);
  };

  deriveNewAccountFromMnemonic = async (keyring: WalletKeyring, alianName?: string) => {
    const _keyring = keyringService.keyrings[keyring.index];
    await keyringService.addNewAccount(_keyring);

    const currentKeyring = await this.getCurrentKeyring();
    if (!currentKeyring) throw new Error('no current keyring');
    keyring = currentKeyring;
    this.changeKeyring(keyring, keyring.accounts.length - 1);

    if (alianName) {
      const account = preferenceService.getCurrentAccount() as Account;
      preferenceService.setAccountAlianName(account.key, alianName);
      account.alianName = alianName;
    }
  };

  getAccountsCount = async () => {
    const accounts = await keyringService.getAccounts();
    return accounts.filter((x) => x).length;
  };

  changeKeyring = (keyring: WalletKeyring, accountIndex = 0) => {
    preferenceService.setCurrentKeyringIndex(keyring.index);
    preferenceService.setCurrentAccount(keyring.accounts[accountIndex]);
    const flag = preferenceService.getAddressFlag(keyring.accounts[accountIndex].address);
    openapiService.setClientAddress(keyring.accounts[accountIndex].address, flag);
  };

  getAllAddresses = (keyring: WalletKeyring, index: number) => {
    const networkType = this.getNetworkType();
    const addresses: string[] = [];
    const _keyring = keyringService.keyrings[keyring.index];
    if (keyring.type === KEYRING_TYPE.HdKeyring || keyring.type === KEYRING_TYPE.KeystoneKeyring) {
      const pathPubkey: { [path: string]: string } = {};
      ADDRESS_TYPES.filter((v) => v.displayIndex >= 0).forEach((v) => {
        let pubkey = pathPubkey[v.hdPath];
        if (!pubkey && _keyring.getAccountByHdPath) {
          pubkey = _keyring.getAccountByHdPath(v.hdPath, index);
        }
        const address = publicKeyToAddress(pubkey, v.value, networkType);
        addresses.push(address);
      });
    } else {
      ADDRESS_TYPES.filter((v) => v.displayIndex >= 0).forEach((v) => {
        const pubkey = keyring.accounts[index].pubkey;
        const address = publicKeyToAddress(pubkey, v.value, networkType);
        addresses.push(address);
      });
    }
    return addresses;
  };

  changeAddressType = async (addressType: AddressType) => {
    const currentAccount = await this.getCurrentAccount();
    const currentKeyringIndex = preferenceService.getCurrentKeyringIndex();
    await keyringService.changeAddressType(currentKeyringIndex, addressType);
    const keyring = await this.getCurrentKeyring();
    if (!keyring) throw new Error('no current keyring');
    this.changeKeyring(keyring, currentAccount?.index);
  };

  signTransaction = async (type: string, from: string, psbt: bitcoin.Psbt, inputs: ToSignInput[]) => {
    const keyring = await keyringService.getKeyringForAccount(from, type);
    return keyringService.signTransaction(keyring, psbt, inputs);
  };

  formatOptionsToSignInputs = async (_psbt: string | bitcoin.Psbt, options?: SignPsbtOptions) => {
    const account = await this.getCurrentAccount();
    if (!account) throw null;

    let toSignInputs: ToSignInput[] = [];
    if (options && options.toSignInputs) {
      // We expect userToSignInputs objects to be similar to ToSignInput interface,
      // but we allow address to be specified in addition to publicKey for convenience.
      toSignInputs = options.toSignInputs.map((input) => {
        const index = Number(input.index);
        if (isNaN(index)) throw new Error('invalid index in toSignInput');

        if (!(input as AddressUserToSignInput).address && !(input as PublicKeyUserToSignInput).publicKey) {
          throw new Error('no address or public key in toSignInput');
        }

        if ((input as AddressUserToSignInput).address && (input as AddressUserToSignInput).address != account.address) {
          throw new Error('invalid address in toSignInput');
        }

        if (
          (input as PublicKeyUserToSignInput).publicKey &&
          (input as PublicKeyUserToSignInput).publicKey != account.pubkey
        ) {
          throw new Error('invalid public key in toSignInput');
        }

        const sighashTypes = input.sighashTypes?.map(Number);
        if (sighashTypes?.some(isNaN)) throw new Error('invalid sighash type in toSignInput');

        return {
          index,
          publicKey: account.pubkey,
          sighashTypes
        };
      });
    } else {
      const networkType = this.getNetworkType();
      const psbtNetwork = toPsbtNetwork(networkType);

      const psbt =
        typeof _psbt === 'string'
          ? bitcoin.Psbt.fromHex(_psbt as string, { network: psbtNetwork })
          : (_psbt as bitcoin.Psbt);
      psbt.data.inputs.forEach((v, index) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let script: any = null;
        if (v.witnessUtxo) {
          script = v.witnessUtxo.script;
        } else if (v.nonWitnessUtxo) {
          const tx = bitcoin.Transaction.fromBuffer(v.nonWitnessUtxo);
          const output = tx.outs[psbt.txInputs[index].index];
          script = output.script;
        }
        const isSigned = v.finalScriptSig || v.finalScriptWitness || v.tapKeySig || v.partialSig || v.tapScriptSig;
        if (script && !isSigned) {
          const address = scriptPkToAddress(script, networkType);
          if (account.address === address) {
            toSignInputs.push({
              index,
              publicKey: account.pubkey,
              sighashTypes: v.sighashType ? [v.sighashType] : undefined
            });
          }
        }
      });

      if (toSignInputs.length === 0) {
        psbt.data.inputs.forEach((input, index) => {
          // if no toSignInputs, sign all inputs
          toSignInputs.push({
            index: index,
            publicKey: account.pubkey
          });
        });
      }
    }

    return toSignInputs;
  };

  signPsbt = async (psbt: bitcoin.Psbt, toSignInputs: ToSignInput[], autoFinalized: boolean) => {
    const account = await this.getCurrentAccount();
    if (!account) throw new Error('no current account');

    const keyring = await this.getCurrentKeyring();
    if (!keyring) throw new Error('no current keyring');
    const _keyring = keyringService.keyrings[keyring.index];

    const networkType = this.getNetworkType();
    const psbtNetwork = toPsbtNetwork(networkType);

    if (!toSignInputs) {
      // Compatibility with legacy code.
      toSignInputs = await this.formatOptionsToSignInputs(psbt);
      if (autoFinalized !== false) autoFinalized = true;
    }

    const isKeystone = keyring.type === KEYRING_TYPE.KeystoneKeyring;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bip32Derivation: any = undefined;

    if (isKeystone) {
      if (!_keyring.mfp) {
        throw new Error('no mfp in keyring');
      }
      bip32Derivation = {
        masterFingerprint: Buffer.from(_keyring.mfp as string, 'hex'),
        path: `${keyring.hdPath}/${account.index}`,
        pubkey: Buffer.from(account.pubkey, 'hex')
      };
    }

    psbt.data.inputs.forEach((input, index) => {
      const isSigned =
        input.finalScriptSig || input.finalScriptWitness || input.tapKeySig || input.partialSig || input.tapScriptSig;
      if (isSigned) {
        return;
      }

      const isToBeSigned = toSignInputs.some((v) => v.index === index);
      if (!isToBeSigned) {
        return;
      }

      let isP2TR = false;
      try {
        bitcoin.payments.p2tr({ output: input.witnessUtxo?.script, network: psbtNetwork });
        isP2TR = true;
      } catch (e) {
        // skip
      }

      if (isP2TR) {
        // fix p2tr input data
        let isKeyPathP2TR = false;

        try {
          const originXPubkey = toXOnly(Buffer.from(account.pubkey, 'hex')).toString('hex');
          const tapInternalKey = toXOnly(Buffer.from(account.pubkey, 'hex'));
          const { output } = bitcoin.payments.p2tr({
            internalPubkey: tapInternalKey,
            network: psbtNetwork
          });
          if (input.witnessUtxo?.script.toString('hex') == output?.toString('hex')) {
            isKeyPathP2TR = true;
          }
          if (isKeyPathP2TR) {
            input.tapInternalKey = tapInternalKey;
          } else {
            // only keypath p2tr can have tapInternalKey
            delete input.tapInternalKey;
          }

          if (isKeyPathP2TR) {
            // keypath p2tr should be signed with origin signer
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isToBeSigned: any = toSignInputs.find((v) => v.index === index);
            if (isToBeSigned.useTweakedSigner == undefined && isToBeSigned.disableTweakSigner == undefined) {
              if (input.tapLeafScript && input.tapLeafScript.length > 0) {
                const script = input.tapLeafScript[0].script.toString('hex');
                if (script.includes(originXPubkey)) {
                  // if tapLeafScript contains origin pubkey, use origin signer
                  isToBeSigned.useTweakedSigner = false;
                } else {
                  // if tapLeafScript not contains origin pubkey, use tweaked signer
                  isToBeSigned.useTweakedSigner = true;
                }
              } else {
                // if no tapLeafScript, use origin signer
                isToBeSigned.useTweakedSigner = false;
              }
            }
          }
        } catch (e) {
          // skip
        }
      }

      if (isKeystone) {
        input.bip32Derivation = [bip32Derivation];
      }
    });

    if (isKeystone) {
      return psbt;
    }

    psbt = await keyringService.signTransaction(_keyring, psbt, toSignInputs);

    if (autoFinalized) {
      toSignInputs.forEach((v) => {
        // psbt.validateSignaturesOfInput(v.index, validator);
        psbt.finalizeInput(v.index);
      });
    }
    return psbt;
  };

  signPsbtWithHex = async (psbtHex: string, toSignInputs: ToSignInput[], autoFinalized: boolean) => {
    const psbt = psbtFromString(psbtHex);
    await this.signPsbt(psbt, toSignInputs, autoFinalized);
    return psbt.toHex();
  };

  signMessage = async (text: string) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    return keyringService.signMessage(account.pubkey, account.type, text);
  };

  signBIP322Simple = async (text: string) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    const networkType = this.getNetworkType();
    return signMessageOfBIP322Simple({
      message: text,
      address: account.address,
      networkType,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wallet: this as any
    });
  };

  signData = async (data: string, type = 'ecdsa') => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    return keyringService.signData(account.pubkey, data, type);
  };

  requestKeyring = (type: string, methodName: string, keyringId: number | null, ...params) => {
    let keyring;
    if (keyringId !== null && keyringId !== undefined) {
      keyring = stashKeyrings[keyringId];
    } else {
      try {
        keyring = this._getKeyringByType(type);
      } catch {
        const Keyring = keyringService.getKeyringClassForType(type);
        keyring = new Keyring();
      }
    }
    if (keyring[methodName]) {
      return keyring[methodName].call(keyring, ...params);
    }
  };

  private _getKeyringByType = (type: string): Keyring => {
    const keyring = keyringService.getKeyringsByType(type)[0];

    if (keyring) {
      return keyring;
    }

    throw new Error(`No ${type} keyring found`);
  };

  addContact = (data: ContactBookItem) => {
    contactBookService.addContact(data);
  };

  updateContact = (data: ContactBookItem) => {
    contactBookService.updateContact(data);
  };

  getContactByAddress = (address: string) => {
    return contactBookService.getContactByAddress(address);
  };

  getContactByAddressAndChain = (address: string, chain: CHAINS_ENUM) => {
    return contactBookService.getContactByAddressAndChain(address, chain);
  };

  private _generateAlianName = (type: string, index: number) => {
    return `${BRAND_ALIAN_TYPE_TEXT[type]} ${index}`;
  };

  removeContact = (address: string, chain?: CHAINS_ENUM) => {
    if (chain) {
      contactBookService.removeContact(address, chain);
    } else {
      console.warn('removeContact called without chain parameter, using old method');
      const contact = contactBookService.getContactByAddress(address);
      if (contact) {
        contactBookService.removeContact(address, contact.chain);
      }
    }
  };

  listContact = (includeAlias = true) => {
    const list = contactBookService.listContacts();
    if (includeAlias) {
      return list;
    } else {
      return list.filter((item) => !item.isAlias);
    }
  };

  listContacts = () => {
    return contactBookService.listContacts();
  };

  saveContactsOrder = (contacts: ContactBookItem[]) => {
    return contactBookService.saveContactsOrder(contacts);
  };

  getContactsByMap = () => {
    return contactBookService.getContactsByMap();
  };

  getNextAlianName = (keyring: WalletKeyring) => {
    return this._generateAlianName(keyring.type, keyring.accounts.length + 1);
  };

  getHighlightWalletList = () => {
    return preferenceService.getWalletSavedList();
  };

  updateHighlightWalletList = (list) => {
    return preferenceService.updateWalletSavedList(list);
  };

  getAllAlianName = () => {
    return contactBookService.listAlias();
  };

  getInitAlianNameStatus = () => {
    return preferenceService.getInitAlianNameStatus();
  };

  updateInitAlianNameStatus = () => {
    preferenceService.changeInitAlianNameStatus();
  };

  getIsFirstOpen = () => {
    return preferenceService.getIsFirstOpen();
  };

  updateIsFirstOpen = () => {
    return preferenceService.updateIsFirstOpen();
  };

  listChainAssets = async (pubkeyAddress: string) => {
    const balance = await openapiService.getAddressBalance(pubkeyAddress);
    const assets: AccountAsset[] = [
      { name: COIN_NAME, symbol: COIN_SYMBOL, amount: balance.amount, value: balance.usd_value }
    ];
    return assets;
  };

  reportErrors = (_error: string) => {
    console.error('report not implemented');
  };

  getNetworkType = () => {
    const chainType = this.getChainType();
    return CHAINS_MAP[chainType].networkType;
  };

  setNetworkType = async (networkType: NetworkType) => {
    if (networkType === NetworkType.MAINNET) {
      this.setChainType(ChainType.OPCAT_MAINNET);
    } else {
      this.setChainType(ChainType.OPCAT_TESTNET);
    }
  };

  getNetworkName = () => {
    const networkType = this.getNetworkType();
    return NETWORK_TYPES[networkType].name;
  };

  getLegacyNetworkName = () => {
    const chainType = this.getChainType();
    if (
      chainType === ChainType.OPCAT_MAINNET ||
      chainType === ChainType.OPCAT_TESTNET
    ) {
      return NETWORK_TYPES[CHAINS_MAP[chainType].networkType].name;
    } else {
      return 'unknown';
    }
  };

  setChainType = async (chainType: ChainType) => {
    const currentChainType = preferenceService.getChainType();
    if (currentChainType === chainType) {
      return;
    }

    preferenceService.setChainType(chainType);
    this.openapi.setEndpoints(CHAINS_MAP[chainType].endpoints);

    const currentAccount = await this.getCurrentAccount();
    const keyring = await this.getCurrentKeyring();
    if (!keyring) throw new Error('no current keyring');
    this.changeKeyring(keyring, currentAccount?.index);

    const chainInfo = getChainInfo(chainType);
    sessionService.broadcastEvent('chainChanged', chainInfo);

    const network = this.getLegacyNetworkName();
    sessionService.broadcastEvent('networkChanged', {
      network
    });

    eventBus.emit(EVENTS.broadcastToUI, {
      method: 'chainChanged',
      params: {
        type: chainType
      }
    });
  };

  getChainType = () => {
    return preferenceService.getChainType();
  };

  getBTCUtxos = async () => {
    // getBTCAccount
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');

    const utxos = await openapiService.getBTCUtxos(account.address);

    // if (checkAddressFlag(openapiService.addressFlag, AddressFlagType.CONFIRMED_UTXO_MODE)) {
    //   utxos = utxos.filter((v) => (v as any).height !== UNCONFIRMED_HEIGHT);
    // }

    const btcUtxos = utxos.map((v) => {
      return {
        txid: v.txid,
        vout: v.vout,
        satoshis: v.satoshis,
        scriptPk: v.scriptPk,
        data: v.data || '',
        addressType: v.addressType,
        pubkey: account.pubkey,
      };
    });
    return btcUtxos;
  };

  getUnavailableUtxos = async () => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');
    const utxos = await openapiService.getUnavailableUtxos(account.address);
    const unavailableUtxos = utxos.map((v) => {
      return {
        txid: v.txid,
        vout: v.vout,
        satoshis: v.satoshis,
        scriptPk: v.scriptPk,
        addressType: v.addressType,
        pubkey: account.pubkey
      };
    });
    return unavailableUtxos;
  };

  sendBTC = async ({
    to,
    amount,
    feeRate,
    enableRBF,
    btcUtxos,
    memo,
    memos
  }: {
    to: string;
    amount: number;
    feeRate: number;
    enableRBF: boolean;
    btcUtxos?: UTXO[];
    memo?: string;
    memos?: string[];
  }) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');

    const networkType = this.getNetworkType();

    const chainType = this.getChainType();
    const isOpcat = chainType == ChainType.OPCAT_MAINNET || chainType == ChainType.OPCAT_TESTNET

    if (!btcUtxos) {
      btcUtxos = await this.getBTCUtxos();
    }

    if (btcUtxos.length == 0) {
      throw new Error('Insufficient balance.');
    }

    if (!isValidAddress(to, networkType)) {
      throw new Error('Invalid address.');
    }
    const res = await txHelpers.sendBTC({
      btcUtxos: btcUtxos,
      tos: [{ address: to, satoshis: amount }],
      networkType,
      changeAddress: account.address,
      feeRate,
      isOpcat,
      enableRBF,
      memo,
      memos
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const psbt: any = res.psbt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toSignInputs: any = res.toSignInputs

    this.setPsbtSignNonSegwitEnable(psbt, true);
    await this.signPsbt(psbt, toSignInputs, false);
    psbt.finalizeAllInputs()
    this.setPsbtSignNonSegwitEnable(psbt, false);
    return psbt.toHex();
  };

  sendAllBTC = async ({
    to,
    feeRate,
    enableRBF,
    btcUtxos
  }: {
    to: string;
    feeRate: number;
    enableRBF: boolean;
    btcUtxos?: UTXO[];
  }) => {
    const account = preferenceService.getCurrentAccount();
    if (!account) throw new Error('no current account');

    const networkType = this.getNetworkType();

    if (!btcUtxos) {
      btcUtxos = await this.getBTCUtxos();
    }

    if (btcUtxos.length == 0) {
      throw new Error('Insufficient balance.');
    }

    const res = await txHelpers.sendAllBTC({
      btcUtxos: btcUtxos,
      toAddress: to,
      networkType,
      feeRate,
      enableRBF
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const psbt: any = res.psbt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toSignInputs: any = res.toSignInputs

    this.setPsbtSignNonSegwitEnable(psbt, true);
    await this.signPsbt(psbt, toSignInputs, true);
    this.setPsbtSignNonSegwitEnable(psbt, false);
    return psbt.toHex();
  };

  pushTx = async (rawtx: string) => {
    const txid = await this.openapi.pushTx(rawtx);
    return txid;
  };

  getAccounts = async () => {
    const keyrings = await this.getKeyrings();
    const accounts: Account[] = keyrings.reduce<Account[]>((pre, cur) => pre.concat(cur.accounts), []);
    return accounts;
  };

  displayedKeyringToWalletKeyring = (displayedKeyring: DisplayedKeyring, index: number, initName = true) => {
    const networkType = this.getNetworkType();
    const addressType = displayedKeyring.addressType;
    const key = 'keyring_' + index;
    const type = displayedKeyring.type;
    const accounts: Account[] = [];
    for (let j = 0; j < displayedKeyring.accounts.length; j++) {
      const { pubkey } = displayedKeyring.accounts[j];
      const address = publicKeyToAddress(pubkey, addressType, networkType);
      const accountKey = key + '#' + j;
      const defaultName = this._generateAlianName(type, j + 1);
      const alianName = preferenceService.getAccountAlianName(accountKey, defaultName);
      const flag = preferenceService.getAddressFlag(address);
      accounts.push({
        type,
        pubkey,
        address,
        alianName,
        index: j,
        key: accountKey,
        flag
      });
    }
    const hdPath =
      type === KEYRING_TYPE.HdKeyring || type === KEYRING_TYPE.KeystoneKeyring ? displayedKeyring.keyring.hdPath : '';
    const alianName = preferenceService.getKeyringAlianName(
      key,
      initName ? `${KEYRING_TYPES[type].alianName} #${index + 1}` : ''
    );
    const keyring: WalletKeyring = {
      index,
      key,
      type,
      addressType,
      accounts,
      alianName,
      hdPath
    };
    return keyring;
  };

  getKeyrings = async (): Promise<WalletKeyring[]> => {
    const displayedKeyrings = await keyringService.getAllDisplayedKeyrings();
    const keyrings: WalletKeyring[] = [];
    for (let index = 0; index < displayedKeyrings.length; index++) {
      const displayedKeyring = displayedKeyrings[index];
      if (displayedKeyring.type !== KEYRING_TYPE.Empty) {
        const keyring = this.displayedKeyringToWalletKeyring(displayedKeyring, displayedKeyring.index);
        keyrings.push(keyring);
      }
    }

    return keyrings;
  };

  getCurrentKeyring = async () => {
    let currentKeyringIndex = preferenceService.getCurrentKeyringIndex();
    const displayedKeyrings = await keyringService.getAllDisplayedKeyrings();
    if (currentKeyringIndex === undefined) {
      const currentAccount = preferenceService.getCurrentAccount();
      for (let i = 0; i < displayedKeyrings.length; i++) {
        if (displayedKeyrings[i].type !== currentAccount?.type) {
          continue;
        }
        const found = displayedKeyrings[i].accounts.find((v) => v.pubkey === currentAccount?.pubkey);
        if (found) {
          currentKeyringIndex = i;
          break;
        }
      }
      if (currentKeyringIndex === undefined) {
        currentKeyringIndex = 0;
      }
    }

    if (
      !displayedKeyrings[currentKeyringIndex] ||
      displayedKeyrings[currentKeyringIndex].type === KEYRING_TYPE.Empty ||
      !displayedKeyrings[currentKeyringIndex].accounts[0]
    ) {
      for (let i = 0; i < displayedKeyrings.length; i++) {
        if (displayedKeyrings[i].type !== KEYRING_TYPE.Empty) {
          currentKeyringIndex = i;
          preferenceService.setCurrentKeyringIndex(currentKeyringIndex);
          break;
        }
      }
    }
    const displayedKeyring = displayedKeyrings[currentKeyringIndex];
    if (!displayedKeyring) return null;
    return this.displayedKeyringToWalletKeyring(displayedKeyring, currentKeyringIndex);
  };

  getCurrentAccount = async () => {
    const currentKeyring = await this.getCurrentKeyring();
    if (!currentKeyring) return null;
    const account = preferenceService.getCurrentAccount();
    let currentAccount: Account | undefined = undefined;
    currentKeyring.accounts.forEach((v) => {
      if (v.pubkey === account?.pubkey) {
        currentAccount = v;
      }
    });
    if (!currentAccount) {
      currentAccount = currentKeyring.accounts[0];
    }
    if (currentAccount) {
      currentAccount.flag = preferenceService.getAddressFlag(currentAccount.address);
      openapiService.setClientAddress(currentAccount.address, currentAccount.flag);
    }

    return currentAccount;
  };

  getEditingKeyring = async () => {
    const editingKeyringIndex = preferenceService.getEditingKeyringIndex();
    const displayedKeyrings = await keyringService.getAllDisplayedKeyrings();
    const displayedKeyring = displayedKeyrings[editingKeyringIndex];
    return this.displayedKeyringToWalletKeyring(displayedKeyring, editingKeyringIndex);
  };

  setEditingKeyring = async (index: number) => {
    preferenceService.setEditingKeyringIndex(index);
  };

  getEditingAccount = async () => {
    const account = preferenceService.getEditingAccount();
    return account;
  };

  setEditingAccount = async (account: Account) => {
    preferenceService.setEditingAccount(account);
  };

  queryDomainInfo = async (domain: string) => {
    const data = await openapiService.getDomainInfo(domain);
    return data;
  };

  getAppSummary = async () => {
    const appTab = preferenceService.getAppTab();
    try {
      const data = await openapiService.getAppSummary();
      const readTabTime = appTab.readTabTime;
      data.apps.forEach((w) => {
        const readAppTime = appTab.readAppTime[w.id];
        if (w.time) {
          if (Date.now() > w.time + 1000 * 60 * 60 * 24 * 7) {
            w.new = false;
          } else if (readAppTime && readAppTime > w.time) {
            w.new = false;
          } else {
            w.new = true;
          }
        } else {
          w.new = false;
        }
      });
      data.readTabTime = readTabTime;
      preferenceService.setAppSummary(data);
      return data;
    } catch (e) {
      console.log('getAppSummary error:', e);
      return appTab.summary;
    }
  };

  readTab = async () => {
    return preferenceService.setReadTabTime(Date.now());
  };

  readApp = async (appid: number) => {
    return preferenceService.setReadAppTime(appid, Date.now());
  };

  getAddressUtxo = async (address: string) => {
    const data = await openapiService.getBTCUtxos(address);
    return data;
  };

  getConnectedSite = permissionService.getConnectedSite;
  getSite = permissionService.getSite;
  getConnectedSites = permissionService.getConnectedSites;
  setRecentConnectedSites = (sites: ConnectedSite[]) => {
    permissionService.setRecentConnectedSites(sites);
  };
  getRecentConnectedSites = () => {
    return permissionService.getRecentConnectedSites();
  };
  getCurrentSite = (tabId: number): ConnectedSite | null => {
    const { origin, name, icon } = sessionService.getSession(tabId) || {};
    if (!origin) {
      return null;
    }
    const site = permissionService.getSite(origin);
    if (site) {
      return site;
    }
    return {
      origin,
      name,
      icon,
      chain: ChainType.OPCAT_MAINNET,
      isConnected: false,
      isSigned: false,
      isTop: false
    };
  };
  getCurrentConnectedSite = (tabId: number) => {
    const { origin } = sessionService.getSession(tabId) || {};
    return permissionService.getWithoutUpdate(origin);
  };
  setSite = (data: ConnectedSite) => {
    permissionService.setSite(data);
    if (data.isConnected) {
      const network = this.getLegacyNetworkName();
      sessionService.broadcastEvent(
        'networkChanged',
        {
          network
        },
        data.origin
      );
    }
  };
  updateConnectSite = (origin: string, data: ConnectedSite) => {
    permissionService.updateConnectSite(origin, data);
    const network = this.getLegacyNetworkName();
    sessionService.broadcastEvent(
      'networkChanged',
      {
        network
      },
      data.origin
    );
  };
  removeAllRecentConnectedSites = () => {
    const sites = permissionService.getRecentConnectedSites().filter((item) => !item.isTop);
    sites.forEach((item) => {
      this.removeConnectedSite(item.origin);
    });
  };
  removeConnectedSite = (origin: string) => {
    sessionService.broadcastEvent('accountsChanged', [], origin);
    permissionService.removeConnectedSite(origin);
  };

  setKeyringAlianName = (keyring: WalletKeyring, name: string) => {
    preferenceService.setKeyringAlianName(keyring.key, name);
    keyring.alianName = name;
    return keyring;
  };

  setAccountAlianName = (account: Account, name: string) => {
    preferenceService.setAccountAlianName(account.key, name);
    account.alianName = name;
    return account;
  };

  addAddressFlag = (account: Account, flag: AddressFlagType) => {
    account.flag = preferenceService.addAddressFlag(account.address, flag);
    openapiService.setClientAddress(account.address, account.flag);
    return account;
  };
  removeAddressFlag = (account: Account, flag: AddressFlagType) => {
    account.flag = preferenceService.removeAddressFlag(account.address, flag);
    openapiService.setClientAddress(account.address, account.flag);
    return account;
  };

  getFeeSummary = async () => {
    return openapiService.getFeeSummary();
  };

  getCoinPrice = async () => {
    return openapiService.getCoinPrice();
  };

  getCAT20sPrice = async (tokenIds: string[]) => {
    return openapiService.getCAT20sPrice(tokenIds);
  };

  decodePsbt = (psbtHex: string, website: string) => {
    return openapiService.decodePsbt(psbtHex, website);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decodeContracts = (contracts: any[], account) => {
    return openapiService.decodeContracts(contracts, account);
  };

  expireUICachedData = (address: string) => {
    return preferenceService.expireUICachedData(address);
  };

  getWalletConfig = () => {
    return openapiService.getWalletConfig();
  };

  getSkippedVersion = () => {
    return preferenceService.getSkippedVersion();
  };

  setSkippedVersion = (version: string) => {
    return preferenceService.setSkippedVersion(version);
  };

  /**
   * Check if a website is a known phishing site
   * @param website Website URL or origin to check
   * @returns Object containing check results with isScammer flag and optional warning message
   */
  checkWebsite = async (
    website: string
  ): Promise<{ isScammer: boolean; warning: string; allowQuickMultiSign?: boolean }> => {
    let isLocalPhishing = false;

    try {
      let hostname = '';
      try {
        hostname = new URL(website).hostname;
      } catch (e) {
        hostname = website;
      }

      const phishingService = await import('@/background/service/phishing');
      isLocalPhishing = phishingService.default.checkPhishing(hostname);
    } catch (error) {
      console.error('[Phishing] Local check error:', error);
    }

    const apiResult = await openapiService.checkWebsite(website);

    if (isLocalPhishing) {
      return {
        ...apiResult,
        isScammer: true
      };
    }

    return apiResult;
  };

  getAddressSummary = async (address: string) => {
    const data = await openapiService.getAddressSummary(address);
    // preferenceService.updateAddressBalance(address, data);
    return data;
  };

  setPsbtSignNonSegwitEnable(psbt: bitcoin.Psbt, enabled: boolean) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = enabled;
  }

  getShowSafeNotice = () => {
    return preferenceService.getShowSafeNotice();
  };

  setShowSafeNotice = (show: boolean) => {
    return preferenceService.setShowSafeNotice(show);
  };

  getVersionDetail = (version: string) => {
    return openapiService.getVersionDetail(version);
  };

  checkKeyringMethod = async (method: string) => {
    const account = await this.getCurrentAccount();
    if (!account) throw new Error('no current account');
    const keyring = await keyringService.getKeyringForAccount(account.pubkey);
    if (!keyring) {
      throw new Error('keyring does not exist');
    }
    if (!keyring[method]) {
      throw new Error(`keyring does not have ${method} method`);
    }
    return { account, keyring };
  };

  // Keystone related functions
  // genSignPsbtUr, parseSignPsbtUr, genSignMsgUr, parseSignMsgUr, getKeystoneConnectionType
  genSignPsbtUr = async (psbtHex: string) => {
    const { keyring } = await this.checkKeyringMethod('genSignPsbtUr');
    return await keyring.genSignPsbtUr!(psbtHex);
  };

  parseSignPsbtUr = async (type: string, cbor: string, isFinalize = true) => {
    const { keyring } = await this.checkKeyringMethod('parseSignPsbtUr');
    const psbtHex = await keyring.parseSignPsbtUr!(type, cbor);
    const psbt = bitcoin.Psbt.fromHex(psbtHex);
    isFinalize && psbt.finalizeAllInputs();
    return {
      psbtHex: psbt.toHex(),
      rawtx: isFinalize ? psbt.extractTransaction().toHex() : undefined
    };
  };

  genSignMsgUr = async (text: string, msgType?: string) => {
    if (msgType === 'bip322-simple') {
      const account = await this.getCurrentAccount();
      if (!account) throw new Error('no current account');
      const psbt = genPsbtOfBIP322Simple({
        message: text,
        address: account.address,
        networkType: this.getNetworkType()
      });
      const toSignInputs = await this.formatOptionsToSignInputs(psbt);
      await this.signPsbt(psbt, toSignInputs, false);
      return await this.genSignPsbtUr(psbt.toHex());
    }
    const { account, keyring } = await this.checkKeyringMethod('genSignMsgUr');
    return await keyring.genSignMsgUr!(account.pubkey, text);
  };

  parseSignMsgUr = async (type: string, cbor: string, msgType: string) => {
    if (msgType === 'bip322-simple') {
      const res = await this.parseSignPsbtUr(type, cbor, false);
      const psbt = bitcoin.Psbt.fromHex(res.psbtHex);
      psbt.finalizeAllInputs();
      return {
        signature: getSignatureFromPsbtOfBIP322Simple(psbt)
      };
    }
    const { keyring } = await this.checkKeyringMethod('parseSignMsgUr');
    const sig = await keyring.parseSignMsgUr!(type, cbor);
    sig.signature = Buffer.from(sig.signature, 'hex').toString('base64');

    return sig;
  };

  getKeystoneConnectionType = async () => {
    const { keyring } = await this.checkKeyringMethod('getConnectionType');
    return keyring.getConnectionType!();
  };

  getEnableSignData = async () => {
    return preferenceService.getEnableSignData();
  };

  setEnableSignData = async (enable: boolean) => {
    return preferenceService.setEnableSignData(enable);
  };

  getAutoLockTimeId = () => {
    return preferenceService.getAutoLockTimeId();
  };

  setAutoLockTimeId = (timeId: number) => {
    preferenceService.setAutoLockTimeId(timeId);
    this._resetTimeout();
  };

  getOpenInSidePanel = () => {
    return preferenceService.getOpenInSidePanel();
  };

  setOpenInSidePanel = (openInSidePanel: boolean) => {
    preferenceService.setOpenInSidePanel(openInSidePanel);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chromeWithSidePanel = chrome as any;
      if (chromeWithSidePanel.sidePanel) {
        chromeWithSidePanel.sidePanel.setPanelBehavior({ openPanelOnActionClick: openInSidePanel });
      }
    } catch (error) {
      console.error('Failed to update side panel behavior:', error);
    }
  };

  setLastActiveTime = () => {
    this._resetTimeout();
  };

  _resetTimeout = async () => {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    const timeId = preferenceService.getAutoLockTimeId();
    const timeConfig = AUTO_LOCK_TIMES[timeId] || AUTO_LOCK_TIMES[DEFAULT_LOCKTIME_ID];
    this.timer = setTimeout(() => {
      this.lockWallet();
    }, timeConfig.time);
  };

  getCAT20List = async (address: string, currentPage: number, pageSize: number) => {
    const cursor = (currentPage - 1) * pageSize;
    const size = pageSize;
    const { total, list } = await openapiService.getCAT20List(address, cursor, size);

    return {
      currentPage,
      pageSize,
      total,
      list
    };
  };

  getAddressCAT20TokenSummary = async (address: string, tokenId: string) => {
    const tokenSummary = await openapiService.getAddressCAT20TokenSummary(address, tokenId);
    return tokenSummary;
  };

  getAddressCAT20UtxoSummary = async (address: string, tokenId: string) => {
    const tokenSummary = await openapiService.getAddressCAT20UtxoSummary(address, tokenId);
    return tokenSummary;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transferCAT20Step1ByMerge = async (mergeData: any, batchIndex: number) => {
    return await openapiService.transferCAT20Step1ByMerge(mergeData, batchIndex);
  };

  transferCAT20Step1 = async (to: string, tokenId: string, tokenAmount: string, feeRate: number) => {
    const currentAccount = await this.getCurrentAccount();
    if (!currentAccount) {
      return;
    }

    const _res = await openapiService.transferCAT20Step1(
      currentAccount.address,
      currentAccount.pubkey,
      to,
      tokenId,
      tokenAmount,
      feeRate
    );
    return _res;
  };

  transferCAT20Step2 = async (transferId: string, commitTx: string, toSignInputs: ToSignInput[]) => {
    const psbt = psbtFromBase64(commitTx);
    await this.signPsbt(psbt, toSignInputs, psbt instanceof bitcoin.Psbt);
    const _res = await openapiService.transferCAT20Step2(transferId, psbt.toBase64());
    return _res;
  };

  transferCAT20Step3 = async (transferId: string, revealTx: string, toSignInputs: ToSignInput[]) => {
    const psbt = psbtFromBase64(revealTx);
    await this.signPsbt(psbt, toSignInputs, psbt instanceof bitcoin.Psbt);
    const _res = await openapiService.transferCAT20Step3(transferId, psbt.toBase64());
    return _res;
  };

  mergeCAT20Prepare = async (tokenId: string, utxoCount: number, feeRate: number) => {
    const currentAccount = await this.getCurrentAccount();
    if (!currentAccount) {
      return;
    }

    const _res = await openapiService.mergeCAT20Prepare(
      currentAccount.address,
      currentAccount.pubkey,
      tokenId,
      utxoCount,
      feeRate
    );
    return _res;
  };

  getAppList = async () => {
    const data = await openapiService.getAppList();
    return data;
  };

  getBannerList = async () => {
    const data = await openapiService.getBannerList();
    return data;
  };

  getBlockActiveInfo = () => {
    return openapiService.getBlockActiveInfo();
  };

  getCAT721List = async (address: string, currentPage: number, pageSize: number) => {
    const cursor = (currentPage - 1) * pageSize;
    const size = pageSize;
    const { total, list } = await openapiService.getCAT721CollectionList(address, cursor, size);

    return {
      currentPage,
      pageSize,
      total,
      list
    };
  };

  getAddressCAT721CollectionSummary = async (address: string, collectionId: string) => {
    const collectionSummary = await openapiService.getAddressCAT721CollectionSummary(address, collectionId);
    return collectionSummary;
  };

  transferCAT721Step1 = async (to: string, collectionId: string, localId: string, feeRate: number) => {
    const currentAccount = await this.getCurrentAccount();
    if (!currentAccount) {
      return;
    }

    const _res = await openapiService.transferCAT721Step1(
      currentAccount.address,
      currentAccount.pubkey,
      to,
      collectionId,
      localId,
      feeRate
    );
    return _res;
  };

  transferCAT721Step2 = async (transferId: string, commitTx: string, toSignInputs: ToSignInput[]) => {
    const networkType = this.getNetworkType();
    const psbtNetwork = toPsbtNetwork(networkType);
    const psbt = bitcoin.Psbt.fromBase64(commitTx, { network: psbtNetwork });
    await this.signPsbt(psbt, toSignInputs, true);
    const _res = await openapiService.transferCAT721Step2(transferId, psbt.toBase64());
    return _res;
  };

  transferCAT721Step3 = async (transferId: string, revealTx: string, toSignInputs: ToSignInput[]) => {
    const networkType = this.getNetworkType();
    const psbtNetwork = toPsbtNetwork(networkType);
    const psbt = bitcoin.Psbt.fromBase64(revealTx, { network: psbtNetwork });
    await this.signPsbt(psbt, toSignInputs, false);
    const _res = await openapiService.transferCAT721Step3(transferId, psbt.toBase64());
    return _res;
  };

  getBuyCoinChannelList = async (coin: 'FB' | 'BTC') => {
    return openapiService.getBuyCoinChannelList(coin);
  };

  createBuyCoinPaymentUrl = (coin: 'FB' | 'BTC', address: string, channel: string) => {
    return openapiService.createBuyCoinPaymentUrl(coin, address, channel);
  };

  sendCoinBypassHeadOffsets = async (tos: { address: string; satoshis: number }[], feeRate: number) => {
    const currentAccount = await this.getCurrentAccount();
    if (!currentAccount) {
      return;
    }

    const { psbtBase64, toSignInputs } = await openapiService.createSendCoinBypassHeadOffsets(
      currentAccount.address,
      currentAccount.pubkey,
      tos,
      feeRate
    );

    const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
    this.setPsbtSignNonSegwitEnable(psbt, true);
    await this.signPsbt(psbt, toSignInputs, true);
    this.setPsbtSignNonSegwitEnable(psbt, false);
    return psbt.toHex();
  };
}

export default new WalletController();
