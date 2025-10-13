import { createContext, ReactNode, useContext } from 'react';

import { AccountAsset } from '@/background/controller/wallet';
import { ContactBookItem, ContactBookStore } from '@/background/service/contactBook';
import { ToSignInput } from '@/background/service/keyring';
import { ConnectedSite } from '@/background/service/permission';
import { AddressFlagType, CHAINS_ENUM, ChainType } from '@/shared/constant';
import {
  Account,
  AddressCAT20TokenSummary,
  AddressCAT20UtxoSummary,
  AddressCAT721CollectionSummary,
  AddressSummary,
  AppInfo,
  AppSummary,
  BitcoinBalance,
  BitcoinBalanceV2,
  BtcChannelItem,
  CAT20Balance,
  CAT20MergeOrder,
  CAT721Balance,
  CoinPrice,
  DecodedPsbt,
  FeeSummary,
  NetworkType,
  SignPsbtOptions,
  TickPriceItem,
  TxHistoryItem,
  UserToSignInput,
  UTXO,
  VersionDetail,
  WalletConfig,
  WalletKeyring,
  WebsiteResult
} from '@/shared/types';
import { AddressType } from '@opcat-labs/wallet-sdk';
import { bitcoin } from '@opcat-labs/wallet-sdk/lib/bitcoin-core';

export interface WalletController {
  openapi: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: (...params: any) => Promise<any>;
  };

  boot(password: string): Promise<void>;
  isBooted(): Promise<boolean>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getApproval(): Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveApproval(data?: any, data2?: any): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rejectApproval(data?: any, data2?: any, data3?: any): Promise<void>;

  hasVault(): Promise<boolean>;

  verifyPassword(password: string): Promise<void>;
  changePassword: (password: string, newPassword: string) => Promise<void>;

  unlock(password: string): Promise<void>;
  isUnlocked(): Promise<boolean>;

  lockWallet(): Promise<void>;
  setPopupOpen(isOpen: boolean): void;
  isReady(): Promise<boolean>;

  getIsFirstOpen(): Promise<boolean>;
  updateIsFirstOpen(): Promise<void>;

  getAddressBalanceV2(address: string): Promise<BitcoinBalanceV2>;
  getAddressBalance(address: string): Promise<BitcoinBalance>;
  getAddressCacheBalance(address: string): Promise<BitcoinBalance>;
  getMultiAddressAssets(addresses: string): Promise<AddressSummary[]>;
  findGroupAssets(
    groups: { type: number; address_arr: string[]; pubkey_arr: string[] }[]
  ): Promise<{ type: number; address_arr: string[]; pubkey_arr: string[]; satoshis_arr: number[] }[]>;

  getAddressHistory: (params: {
    address: string;
    start: number;
    limit: number;
  }) => Promise<{ start: number; total: number; detail: TxHistoryItem[] }>;
  getAddressCacheHistory: (address: string) => Promise<TxHistoryItem[]>;

  listChainAssets: (address: string) => Promise<AccountAsset[]>;

  getLocale(): Promise<string>;
  setLocale(locale: string): Promise<void>;

  getCurrency(): Promise<string>;
  setCurrency(currency: string): Promise<void>;

  clearKeyrings(): Promise<void>;
  getPrivateKey(password: string, account: { address: string; type: string }): Promise<{ hex: string; wif: string }>;
  getMnemonics(
    password: string,
    keyring: WalletKeyring
  ): Promise<{
    hdPath: string;
    mnemonic: string;
    passphrase: string;
  }>;
  createKeyringWithPrivateKey(data: string, addressType: AddressType, alianName?: string): Promise<Account[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPreMnemonics(): Promise<any>;
  generatePreMnemonic(): Promise<string>;
  removePreMnemonics(): void;
  createKeyringWithMnemonics(
    mnemonic: string,
    hdPath: string,
    passphrase: string,
    addressType: AddressType,
    accountCount: number
  ): Promise<{ address: string; type: string }[]>;
  createKeyringWithKeystone(
    urType: string,
    urCbor: string,
    addressType: AddressType,
    hdPath: string,
    accountCount: number,
    filterPubkey?: string[],
    connectionType?: 'USB' | 'QR'
  ): Promise<{ address: string; type: string }[]>;
  createTmpKeyringWithPrivateKey(privateKey: string, addressType: AddressType): Promise<WalletKeyring>;
  createTmpKeyringWithKeystone(
    urType: string,
    urCbor: string,
    addressType: AddressType,
    hdPath: string,
    accountCount?: number
  ): Promise<WalletKeyring>;

  createTmpKeyringWithMnemonics(
    mnemonic: string,
    hdPath: string,
    passphrase: string,
    addressType: AddressType,
    accountCount?: number
  ): Promise<WalletKeyring>;
  removeKeyring(keyring: WalletKeyring): Promise<WalletKeyring>;
  deriveNewAccountFromMnemonic(keyring: WalletKeyring, alianName?: string): Promise<string[]>;
  getAccountsCount(): Promise<number>;
  getAllAlianName: () => (ContactBookItem | undefined)[];
  getContactsByMap: () => ContactBookStore;

  getCurrentAccount(): Promise<Account>;
  getAccounts(): Promise<Account[]>;
  getNextAlianName: (keyring: WalletKeyring) => Promise<string>;

  getCurrentKeyringAccounts(): Promise<Account[]>;

  signTransaction(psbt: bitcoin.Psbt, inputs: ToSignInput[]): Promise<bitcoin.Psbt>;
  signPsbtWithHex(psbtHex: string, toSignInputs: ToSignInput[], autoFinalized: boolean): Promise<string>;

  sendBTC(data: {
    to: string;
    amount: number;
    btcUtxos: UTXO[];
    feeRate: number;
    enableRBF: boolean;
    memo?: string;
    memos?: string[];
  }): Promise<string>;

  sendAllBTC(data: { to: string; btcUtxos: UTXO[]; feeRate: number; enableRBF: boolean }): Promise<string>;


  pushTx(rawtx: string): Promise<string>;

  getAppSummary(): Promise<AppSummary>;
  getBTCUtxos(): Promise<UTXO[]>;
  getUnavailableUtxos(): Promise<UTXO[]>;

  getNetworkType(): Promise<NetworkType>;
  setNetworkType(type: NetworkType): Promise<void>;

  getChainType(): Promise<ChainType>;
  setChainType(type: ChainType): Promise<void>;

  getConnectedSites(): Promise<ConnectedSite[]>;
  removeConnectedSite(origin: string): Promise<void>;
  getCurrentConnectedSite(id: string): Promise<ConnectedSite>;

  getCurrentKeyring(): Promise<WalletKeyring>;
  getKeyrings(): Promise<WalletKeyring[]>;
  changeKeyring(keyring: WalletKeyring, accountIndex?: number): Promise<void>;
  getAllAddresses(keyring: WalletKeyring, index: number): Promise<string[]>;

  setKeyringAlianName(keyring: WalletKeyring, name: string): Promise<WalletKeyring>;
  changeAddressType(addressType: AddressType): Promise<void>;

  setAccountAlianName(account: Account, name: string): Promise<Account>;
  getFeeSummary(): Promise<FeeSummary>;
  getCoinPrice(): Promise<CoinPrice>;
  getCAT20sPrice(tokenIds: string[]): Promise<{ [tokenId: string]: TickPriceItem }>;

  setEditingKeyring(keyringIndex: number): Promise<void>;
  getEditingKeyring(): Promise<WalletKeyring>;

  setEditingAccount(account: Account): Promise<void>;
  getEditingAccount(): Promise<Account>;

  decodePsbt(psbtHex: string, website: string): Promise<DecodedPsbt>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decodeContracts(contracts: any[], account: any): Promise<any[]>;

  expireUICachedData(address: string): Promise<void>;

  getWalletConfig(): Promise<WalletConfig>;

  getSkippedVersion(): Promise<string>;
  setSkippedVersion(version: string): Promise<void>;

  checkWebsite(website: string): Promise<WebsiteResult>;

  readTab(tabName: string): Promise<void>;
  readApp(appid: number): Promise<void>;

  formatOptionsToSignInputs(psbtHex: string, options?: SignPsbtOptions): Promise<ToSignInput[]>;

  getAddressSummary(address: string): Promise<AddressSummary>;

  getShowSafeNotice(): Promise<boolean>;
  setShowSafeNotice(show: boolean): Promise<void>;

  // address flag
  addAddressFlag(account: Account, flag: AddressFlagType): Promise<Account>;
  removeAddressFlag(account: Account, flag: AddressFlagType): Promise<Account>;

  getVersionDetail(version: string): Promise<VersionDetail>;

  genSignPsbtUr(psbtHex: string): Promise<{ type: string; cbor: string }>;
  parseSignPsbtUr(type: string, cbor: string, isFinalize?: boolean): Promise<{ psbtHex: string; rawtx?: string }>;
  genSignMsgUr(text: string, msgType?: string): Promise<{ type: string; cbor: string; requestId: string }>;
  parseSignMsgUr(type: string, cbor: string, msgType: string): Promise<{ signature: string }>;
  getKeystoneConnectionType(): Promise<'USB' | 'QR'>;

  getEnableSignData(): Promise<boolean>;
  setEnableSignData(enable: boolean): Promise<void>;

  setAutoLockTimeId(timeId: number): Promise<void>;
  getAutoLockTimeId(): Promise<number>;

  getCAT20List(
    address: string,
    currentPage: number,
    pageSize: number
  ): Promise<{ currentPage: number; pageSize: number; total: number; list: CAT20Balance[] }>;

  getAddressCAT20TokenSummary(address: string, tokenId: string): Promise<AddressCAT20TokenSummary>;

  getAddressCAT20UtxoSummary(address: string, tokenId: string): Promise<AddressCAT20UtxoSummary>;

  transferCAT20Step1(
    to: string,
    tokenId: string,
    tokenAmount: string,
    feeRate: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ commitTx: string; toSignInputs: UserToSignInput[]; feeRate: number, transferData: any }>;
  transferCAT20Step2(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transferData: any,
    commitTx: string,
    toSignInputs: UserToSignInput[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ revealTx: string; toSignInputs: UserToSignInput[], transferData: any }>;
  transferCAT20Step3(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transferData: any,
    revealTx: string,
    toSignInputs: UserToSignInput[],
  ): Promise<{ txid: string }>;

  mergeCAT20Prepare(tokenId: string, utxoCount: number, feeRate: number): Promise<CAT20MergeOrder>;
  transferCAT20Step1ByMerge(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mergeData: any,
    batchIndex: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ commitTx: string; toSignInputs: UserToSignInput[]; feeRate: number, transferData: any }>;

  getAppList(): Promise<{ tab: string; items: AppInfo[] }[]>;
  getBannerList(): Promise<{ id: string; img: string; link: string }[]>;
  getBlockActiveInfo(): Promise<{ allTransactions: number; allAddrs: number }>;

  getCAT721List(
    address: string,
    currentPage: number,
    pageSize: number
  ): Promise<{ currentPage: number; pageSize: number; total: number; list: CAT721Balance[] }>;

  getAddressCAT721CollectionSummary(address: string, collectionId: string): Promise<AddressCAT721CollectionSummary>;

  transferCAT721Step1(
    to: string,
    collectionId: string,
    localId: string,
    feeRate: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ id: string; commitTx: string; toSignInputs: UserToSignInput[]; feeRate: number, transferData: any }>;
  transferCAT721Step2(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transferData: any, 
    commitTx: string,
    toSignInputs: UserToSignInput[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ revealTx: string; toSignInputs: UserToSignInput[], transferData: any }>;
  transferCAT721Step3(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transferData: any, 
    revealTx: string, 
    toSignInputs: UserToSignInput[]
  ): Promise<{ txid: string }>;

  getBuyCoinChannelList(coin: string): Promise<BtcChannelItem[]>;
  createBuyCoinPaymentUrl(coin: string, address: string, channel: string): Promise<string>;


  // todo: confirm to delete
  createSendTokenStep1(
    chainId: string,
    // tokenBalance: CosmosBalance,
    tokenBalance: any,
    to: string,
    memo: string,
    {
      gasLimit,
      gasPrice,
      gasAdjustment
    }: {
      gasLimit: number;
      gasPrice: string;
      gasAdjustment?: number;
    }
  ): Promise<string>;
  createSendTokenStep2(chainId: string, signature: string): Promise<string>;

  getContactByAddress(address: string): Promise<ContactBookItem | undefined>;
  getContactByAddressAndChain(address: string, chain: CHAINS_ENUM): Promise<ContactBookItem | undefined>;
  updateContact(data: ContactBookItem): Promise<void>;
  removeContact(address: string, chain?: CHAINS_ENUM): Promise<void>;
  listContacts(): Promise<ContactBookItem[]>;
  saveContactsOrder(contacts: ContactBookItem[]): Promise<void>;


  setLastActiveTime(): void;

  getOpenInSidePanel(): Promise<boolean>;
  setOpenInSidePanel(openInSidePanel: boolean): Promise<void>;

  sendCoinBypassHeadOffsets(tos: { address: string; satoshis: number }[], feeRate: number): Promise<string>;
}

const WalletContext = createContext<{
  wallet: WalletController;
} | null>(null);

const WalletProvider = ({ children, wallet }: { children?: ReactNode; wallet: WalletController }) => (
  <WalletContext.Provider value={{ wallet }}>{children}</WalletContext.Provider>
);

const useWallet = () => {
  const { wallet } = useContext(WalletContext) as {
    wallet: WalletController;
  };

  return wallet;
};

export { useWallet, WalletProvider };

