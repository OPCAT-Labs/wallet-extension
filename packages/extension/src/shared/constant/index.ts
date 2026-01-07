/* eslint-disable quotes */

/* constants pool */
import { t } from '@/shared/modules/i18n';

import { AddressType, NetworkType, RestoreWalletType } from '../types';

export type CHAINS_ENUM = ChainType;

export const KEYRING_TYPE = {
  HdKeyring: 'HD Key Tree',
  SimpleKeyring: 'Simple Key Pair',
  WatchAddressKeyring: 'Watch Address',
  WalletConnectKeyring: 'WalletConnect',
  Empty: 'Empty',
  KeystoneKeyring: 'Keystone'
};

export const KEYRING_CLASS = {
  PRIVATE_KEY: 'Simple Key Pair',
  MNEMONIC: 'HD Key Tree',
  KEYSTONE: 'Keystone'
};

export const KEYRING_TYPE_TEXT = {
  [KEYRING_TYPE.HdKeyring]: 'Created by Mnemonic',
  [KEYRING_TYPE.SimpleKeyring]: 'Imported by Private Key',
  [KEYRING_TYPE.WatchAddressKeyring]: 'Watch Mode',
  [KEYRING_TYPE.KeystoneKeyring]: 'Import from Keystone'
};
export const BRAND_ALIAN_TYPE_TEXT = {
  [KEYRING_TYPE.HdKeyring]: 'Account',
  [KEYRING_TYPE.SimpleKeyring]: 'Private Key',
  [KEYRING_TYPE.WatchAddressKeyring]: 'Watch',
  [KEYRING_TYPE.KeystoneKeyring]: 'Account'
};

export const KEYRING_TYPES: {
  [key: string]: {
    name: string;
    tag: string;
    alianName: string;
  };
} = {
  'HD Key Tree': {
    name: 'HD Key Tree',
    tag: 'HD',
    alianName: 'HD Wallet'
  },
  'Simple Key Pair': {
    name: 'Simple Key Pair',
    tag: 'IMPORT',
    alianName: 'Single Wallet'
  },
  Keystone: {
    name: 'Keystone',
    tag: 'KEYSTONE',
    alianName: 'Keystone'
  }
};

export const IS_CHROME = /Chrome\//i.test(navigator.userAgent);

export const IS_FIREFOX = /Firefox\//i.test(navigator.userAgent);

export const IS_LINUX = /linux/i.test(navigator.userAgent);

let chromeVersion: number | null = null;

if (IS_CHROME) {
  const matches = navigator.userAgent.match(/Chrome\/(\d+[^.\s])/);
  if (matches && matches.length >= 2) {
    chromeVersion = Number(matches[1]);
  }
}

export const IS_AFTER_CHROME91 = IS_CHROME ? chromeVersion && chromeVersion >= 91 : false;

export const GAS_LEVEL_TEXT = {
  slow: 'Standard',
  normal: 'Fast',
  fast: 'Instant',
  custom: 'Custom'
};

export const IS_WINDOWS = /windows/i.test(navigator.userAgent);

export const LANGS = [
  {
    value: 'en',
    label: 'English'
  },
  {
    value: 'zh_CN',
    label: 'Chinese'
  },
  {
    value: 'ja',
    label: 'Japanese'
  },
  {
    value: 'es',
    label: 'Spanish'
  }
];

export const ADDRESS_TYPES: {
  value: AddressType;
  label: string;
  name: string;
  hdPath: string;
  displayIndex: number;
}[] = [
  {
    value: AddressType.P2PKH,
    label: 'P2PKH',
    name: 'P2PKH',
    hdPath: "m/44'/0'/0'/0",
    displayIndex: 3,
  },
];


export const getRestoreWallets = (): { value: RestoreWalletType; name: string; addressTypes: AddressType[] }[] => [
  {
    value: RestoreWalletType.UNISAT,
    name: 'Opcat Wallet',
    addressTypes: [
      AddressType.P2PKH
    ]
  }
];

export enum ChainType {
  OPCAT_MAINNET = 'OPCAT_MAINNET',
  OPCAT_TESTNET = 'OPCAT_TESTNET'
}

export const NETWORK_TYPES = [
  { value: NetworkType.MAINNET, label: 'LIVENET', name: 'livenet', validNames: [0, 'livenet', 'mainnet'] },
  { value: NetworkType.TESTNET, label: 'TESTNET', name: 'testnet', validNames: ['testnet'] }
];

export type TypeChain = {
  enum: ChainType;
  label: string;
  iconLabel: string;
  icon: string;
  unit: string;
  networkType: NetworkType;
  endpoints: string[];
  mempoolSpaceUrl: string;
  unisatUrl: string;
  unisatExplorerUrl: string;
  okxExplorerUrl: string;
  isViewTxHistoryInternally?: boolean;
  disable?: boolean;
  showPrice: boolean;
  defaultExplorer: 'mempool-space' | 'unisat-explorer';
};

export const CHAINS_MAP: { [key: string]: TypeChain } = {
  [ChainType.OPCAT_MAINNET]: {
    enum: ChainType.OPCAT_MAINNET,
    label: 'OPCAT Layer Mainnet',
    iconLabel: 'OPCAT',
    icon: './images/artifacts/opcat-mainnet.svg',
    unit: 'cBTC',
    networkType: NetworkType.MAINNET,
    endpoints: [],
    mempoolSpaceUrl: '',
    unisatUrl: '',
    unisatExplorerUrl: '',
    okxExplorerUrl: '',
    isViewTxHistoryInternally: false,
    disable: true,
    // isOpcat: true,
    showPrice: false,
    defaultExplorer: 'mempool-space',
  },
  [ChainType.OPCAT_TESTNET]: {
    enum: ChainType.OPCAT_TESTNET,
    label: 'OPCAT Layer Testnet',
    iconLabel: 'OPCAT',
    icon: './images/artifacts/opcat-testnet.svg',
    unit: 'tcBTC',
    networkType: NetworkType.TESTNET,
    // endpoints: ['https://wallet-api-testnet.opcatlabs.io'],
    endpoints: ['http://127.0.0.1:3000'],
    mempoolSpaceUrl: 'https://testnet.opcatlabs.io',
    unisatUrl: '',
    unisatExplorerUrl: '',
    okxExplorerUrl: '',
    isViewTxHistoryInternally: false,
    // isOpcat: true,
    showPrice: false,
    defaultExplorer: 'mempool-space',
  }
};

export const CHAINS = Object.values(CHAINS_MAP);

export type TypeChainGroup = {
  type: 'single' | 'list';
  chain?: TypeChain;
  label?: string;
  icon?: string;
  items?: TypeChain[];
};

export const CHAIN_GROUPS: TypeChainGroup[] = [
  {
    type: 'single',
    chain: CHAINS_MAP[ChainType.OPCAT_MAINNET]
  },
  {
    type: 'single',
    chain: CHAINS_MAP[ChainType.OPCAT_TESTNET]
  }
];

export const MINIMUM_GAS_LIMIT = 21000;

export enum WATCH_ADDRESS_CONNECT_TYPE {
  WalletConnect = 'WalletConnect'
}

export const WALLETCONNECT_STATUS_MAP = {
  PENDING: 1,
  CONNECTED: 2,
  WAITING: 3,
  SIBMITTED: 4,
  REJECTED: 5,
  FAILD: 6
};

export const INTERNAL_REQUEST_ORIGIN = 'https://unisat.io';

export const INTERNAL_REQUEST_SESSION = {
  name: 'UniSat Wallet',
  origin: INTERNAL_REQUEST_ORIGIN,
  icon: './images/logo/logo@128x.png'
};

export const EVENTS = {
  broadcastToUI: 'broadcastToUI',
  broadcastToBackground: 'broadcastToBackground',
  SIGN_FINISHED: 'SIGN_FINISHED',
  WALLETCONNECT: {
    STATUS_CHANGED: 'WALLETCONNECT_STATUS_CHANGED',
    INIT: 'WALLETCONNECT_INIT',
    INITED: 'WALLETCONNECT_INITED'
  },
  transferCAT20Progress: 'transferCAT20Progress',
  transferCAT721Progress: 'transferCAT721Progress'
};

export const SORT_WEIGHT = {
  [KEYRING_TYPE.HdKeyring]: 1,
  [KEYRING_TYPE.SimpleKeyring]: 2,
  [KEYRING_TYPE.WalletConnectKeyring]: 4,
  [KEYRING_TYPE.WatchAddressKeyring]: 5
};

export const COIN_NAME = 'BTC';
export const COIN_SYMBOL = 'BTC';

export const COIN_DUST = 1000;

export const TO_LOCALE_STRING_CONFIG = {
  minimumFractionDigits: 8
};

export const SAFE_DOMAIN_CONFIRMATION = 3;

export const GITHUB_URL = '#';
export const DISCORD_URL = '#';
export const TWITTER_URL = 'https://x.com/opcatlayer';
export const TELEGRAM_URL = '#';
export const WEBSITE_URL = 'https://opcatlabs.io';
export const FEEDBACK_URL = '#';
export const EMAIL_URL = 'info@opcatlabs.io';
export const DOCS_URL = '#';
export const MEDIUM_URL = '#';
export const UPDATE_URL = '#';
export const REVIEW_URL =
  '#';
export const TERMS_OF_SERVICE_URL = '#';
export const PRIVACY_POLICY_URL = '#';

export const WALLET_NAME = 'OPCAT'
export const WALLET_FULL_NAME = 'OPCAT Wallet'
export const X_CLIENT_HEADER = 'OPCAT Wallet'
export const PAGE_PROVIDER_VARIABLE_NAME = 'opcat'
export const PAGE_PROVIDER_VARIABLE_NAME_ALIAS = 'opcat_wallet'
export const MESSAGE_EVENT_PRE = 'OPCAT_WALLET_'
export const ADDRESS_VERIFIER_URL = '#'

export const CHANNEL = process.env.channel!;
export const VERSION = process.env.release!;
export const MANIFEST_VERSION = process.env.manifest!;

export enum AddressFlagType {
  CONFIRMED_UTXO_MODE = 0b10,
  DISABLE_AUTO_SWITCH_CONFIRMED = 0b100,
}

export const UNCONFIRMED_HEIGHT = 4194303;

export enum PaymentChannelType {
  MoonPay = 'moonpay',
  AlchemyPay = 'alchemypay',
  Transak = 'transak'
}

export const PAYMENT_CHANNELS = {
  moonpay: {
    name: 'MoonPay',
    img: './images/artifacts/moonpay.png'
  },
  alchemypay: {
    name: 'Alchemy Pay',
    img: './images/artifacts/alchemypay.png'
  },

  transak: {
    name: 'Transak',
    img: './images/artifacts/transak.png'
  }
};

export enum HardwareWalletType {
  Keystone = 'keystone',
  Ledger = 'ledger',
  Trezor = 'trezor'
}

export const HARDWARE_WALLETS = {
  [HardwareWalletType.Keystone]: {
    name: 'Keystone',
    img: './images/artifacts/keystone.png'
  },
  [HardwareWalletType.Ledger]: {
    name: 'Ledger',
    img: './images/artifacts/ledger.png'
  },
  [HardwareWalletType.Trezor]: {
    name: 'Trezor',
    img: './images/artifacts/trezor.png'
  }
};

export const AUTO_LOCK_TIMES = [
  { id: 0, time: 30000 },
  { id: 1, time: 60000 },
  { id: 2, time: 180000 },
  { id: 3, time: 300000 },
  { id: 4, time: 600000 },
  { id: 5, time: 1800000 },
  { id: 6, time: 3600000 },
  { id: 7, time: 14400000 }
];

export const getAutoLockTimes = () => [
  { id: 0, time: 30000, label: `30${t('seconds')}` },
  { id: 1, time: 60000, label: `1${t('minute')}` },
  { id: 2, time: 180000, label: `3${t('minutes')}` },
  { id: 3, time: 300000, label: `5${t('minutes')}` },
  { id: 4, time: 600000, label: `10${t('minutes')}` },
  { id: 5, time: 1800000, label: `30${t('minutes')}` },
  { id: 6, time: 3600000, label: `1${t('hour')}` },
  { id: 7, time: 14400000, label: `4${t('hours')}` }
];

export const DEFAULT_LOCKTIME_ID = 5;
