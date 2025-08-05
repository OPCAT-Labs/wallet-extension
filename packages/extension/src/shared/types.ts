import { UnspentOutput } from '@unisat/wallet-sdk';
import { CHAINS_ENUM, PaymentChannelType } from './constant';

export enum AddressType {
  P2PKH,
  // P2WPKH,
  // P2TR,
  // P2SH_P2WPKH,
  // M44_P2WPKH,
  // M44_P2TR
}

export enum NetworkType {
  MAINNET,
  TESTNET
}

// todo: only preserve opcat wallet
export enum RestoreWalletType {
  UNISAT,
  SPARROW,
  XVERSE,
  OTHERS
}

export interface Chain {
  name: string;
  logo: string;
  enum: CHAINS_ENUM;
  network: string;
}

export interface BitcoinBalance {
  confirm_amount: string;
  pending_amount: string;
  amount: string;
  confirm_btc_amount: string;
  pending_btc_amount: string;
  btc_amount: string;
  confirm_inscription_amount: string;
  pending_inscription_amount: string;
  inscription_amount: string;
  usd_value: string;
}

export interface AddressAssets {
  total_btc: string;
  satoshis?: number;
}

export interface TxHistoryInOutItem {
  address: string;
  value: number;
}

export interface TxHistoryItem {
  txid: string;
  confirmations: number;
  height: number;
  timestamp: number;
  size: number;
  feeRate: number;
  fee: number;
  outputValue: number;
  vin: TxHistoryInOutItem[];
  vout: TxHistoryInOutItem[];
  types: string[];
  methods: string[];
}

export interface AppInfo {
  logo: string;
  title: string;
  desc: string;
  route?: string;
  url: string;
  time: number;
  id: number;
  tag?: string;
  readtime?: number;
  new?: boolean;
  tagColor?: string;
}

export interface AppSummary {
  apps: AppInfo[];
  readTabTime?: number;
}

export interface FeeSummary {
  list: {
    title: string;
    desc: string;
    feeRate: number;
  }[];
}

export interface CoinPrice {
  btc: number;
  fb: number;
}

export interface UTXO extends UnspentOutput {
  // utxo.data on opcat
  data?: string
}

export interface UTXO_Detail {
  txId: string;
  outputIndex: number;
  satoshis: number;
  scriptPk: string;
  data?: string;
  addressType: AddressType;
}

export enum TxType {
  SIGN_TX,
  SEND_BITCOIN,
}

interface BaseUserToSignInput {
  index: number;
  sighashTypes: number[] | undefined;
}

export interface AddressUserToSignInput extends BaseUserToSignInput {
  address: string;
}

export interface PublicKeyUserToSignInput extends BaseUserToSignInput {
  publicKey: string;
}

export type UserToSignInput = AddressUserToSignInput | PublicKeyUserToSignInput;

export interface SignPsbtOptions {
  autoFinalized: boolean;
  toSignInputs?: UserToSignInput[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contracts?: any[];
}

export interface ToSignInput {
  index: number;
  publicKey: string;
  sighashTypes?: number[];
}

export type WalletKeyring = {
  key: string;
  index: number;
  type: string;
  addressType: AddressType;
  accounts: Account[];
  alianName: string;
  hdPath: string;
};

export interface Account {
  type: string;
  pubkey: string;
  address: string;
  brandName?: string;
  alianName?: string;
  displayBrandName?: string;
  index?: number;
  balance?: number;
  key: string;
  flag: number;
}

export interface TokenBalance {
  availableBalance: string;
  overallBalance: string;
  ticker: string;
  transferableBalance: string;
  availableBalanceSafe: string;
  availableBalanceUnSafe: string;
  selfMint: boolean;
  displayName?: string;
  tag?: string;
}

export interface TokenInfo {
  totalSupply: string;
  totalMinted: string;
  decimal: number;
  holder: string;
  // inscriptionId: string;
  selfMint?: boolean;
  holdersCount: number;
  historyCount: number;
}

export interface TokenTransfer {
  ticker: string;
  amount: string;
  // inscriptionId: string;
  // inscriptionNumber: number;
  timestamp: number;
  confirmations: number;
  satoshi: number;
}

export interface AddressTokenSummary {
  tokenInfo: TokenInfo;
  tokenBalance: TokenBalance;
  historyList: TokenTransfer[];
  transferableList: TokenTransfer[];
}

export enum RiskType {
  SIGHASH_NONE,
  SCAMMER_ADDRESS,
  UNCONFIRMED_UTXO,
  MULTIPLE_ASSETS,
  LOW_FEE_RATE,
  HIGH_FEE_RATE
}

export interface Risk {
  type: RiskType;
  level: 'danger' | 'warning' | 'critical';
  title: string;
  desc: string;
}

export interface DecodedPsbt {
  inputInfos: {
    txid: string;
    vout: number;
    address: string;
    value: number;
    sighashType: number;
    cat20: CAT20Balance[];
    contract?: ContractResult;
  }[];
  outputInfos: {
    address: string;
    value: number;
    cat20: CAT20Balance[];
    contract?: ContractResult;
  }[];
  feeRate: number;
  fee: number;
  features: {
    rbf: boolean;
  };
  risks: Risk[];
  isScammer: boolean;
  recommendedFeeRate: number;
  shouldWarnFeeRate: boolean;
}

export interface ToAddressInfo {
  address: string;
  domain?: string;
}

export interface RawTxInfo {
  psbtHex: string;
  rawtx: string;
  toAddressInfo?: ToAddressInfo;
  fee?: number;
}

export interface WalletConfig {
  version: string;
  moonPayEnabled: boolean;
  statusMessage: string;
  endpoint: string;
  chainTip: string;
  disableUtxoTools: boolean;
}

export enum WebsiteState {
  CHECKING,
  SCAMMER,
  SAFE
}

export interface AddressSummary {
  address: string;
  totalSatoshis: number;
  btcSatoshis: number;
  assetSatoshis: number;
  loading?: boolean;
}

export interface VersionDetail {
  version: string;
  title: string;
  changelogs: string[];
  notice: string;
}

export interface BtcChannelItem {
  channel: PaymentChannelType;
  quote: number;
  payType: string[];
}

export type TickPriceItem = {
  curPrice: number;
  changePercent: number;
};

export interface CAT20Balance {
  tokenId: string;
  amount: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface CAT20TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  max: string;
  premine: string;
  limit: number;
}

export interface AddressCAT20TokenSummary {
  cat20Info: CAT20TokenInfo;
  cat20Balance: CAT20Balance;
}

export interface AddressCAT20UtxoSummary {
  availableTokenAmounts: string[];
  availableUtxoCount: number;
  totalUtxoCount: number;
}

export interface CAT20MergeOrder {
  id: string;
  batchIndex: number;
  batchCount: number;
  ct: number;
}

export interface WebsiteResult {
  isScammer: boolean;
  warning: string;
  allowQuickMultiSign: boolean;
}

export interface CAT721Balance {
  collectionId: string;
  name: string;
  count: number;
  previewLocalIds: string[];
  contentType: string;
}

export interface CAT721CollectionInfo {
  collectionId: string;
  name: string;
  symbol: string;
  max: string;
  premine: string;
  description: string;
  contentType: string;
}

export interface AddressCAT721CollectionSummary {
  collectionInfo: CAT721CollectionInfo;
  localIds: string[];
}

export interface BitcoinBalanceV2 {
  availableBalance: number;
  unavailableBalance: number;
  totalBalance: number;
}

export interface ContractResult {
  id: string;
  name: string;
  description: string;
  address: string;
  script: string;
  isOwned: boolean;
}

export interface RequestMethodSendBitcoinParams {
  sendBitcoinParams: {
    toAddress: string;
    satoshis: number;
    feeRate?: number;
    memo?: string;
    memos?: string[];
  };
  type: TxType;
}

export interface RequestMethodSignPsbtParams {
  // sendInscriptionParams: {
  //   toAddress: string;
  //   inscriptionId: string;
  //   feeRate: number | undefined;
  // };
  type: TxType;
}

export interface RequestMethodSignMessageParams {
  text: string;
  type: string;
}

export interface RequestMethodSignMessagesParams {
  messages: {
    text: string;
    type: string;
  }[];
}

export interface RequestMethodSignPsbtParams {
  psbtHex: string;
  type: TxType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any;
}

export interface RequestMethodSignPsbtsParams {
  psbtHexs: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any;
}

export interface RequestMethodGetBitcoinUtxosParams {
  cursor: number;
  size: number;
}

export interface RequestMethodGetAvailableUtxosParams {
  cursor: number;
  size: number;
}
