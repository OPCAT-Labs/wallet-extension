# UniSat Wallet API 文档

## 概述
本文档列出了 UniSat Wallet 扩展中使用的所有 API 接口。

## 通用请求头
所有 API 请求都包含以下请求头：
- `X-Client`: UniSat Wallet
- `X-Version`: 版本号
- `x-address`: 客户端地址
- `x-flag`: 地址标志
- `x-channel`: 渠道信息
- `x-udid`: 设备ID
- `x-lang`: 语言设置
- `Content-Type`: application/json;charset=utf-8 (仅 POST 请求)

## API 列表

### 默认配置相关

#### getWalletConfig
- **方法**: GET
- **URL**: `/v5/default/config`
- **参数**: 无
- **返回类型**: `WalletConfig`

#### getBlockActiveInfo
- **方法**: GET
- **URL**: `/v5/default/block-active-info`
- **参数**: 无
- **返回类型**: `{ allTransactions: number; allAddrs: number }`

#### getInscriptionSummary
- **方法**: GET
- **URL**: `/v5/default/inscription-summary`
- **参数**: 无
- **返回类型**: `InscriptionSummary`

#### getAppSummary
- **方法**: GET
- **URL**: `/v5/default/app-summary-v2`
- **参数**: 无
- **返回类型**: `AppSummary`

#### getFeeSummary
- **方法**: GET
- **URL**: `/v5/default/fee-summary`
- **参数**: 无
- **返回类型**: `FeeSummary`

#### getCoinPrice
- **方法**: GET
- **URL**: `/v5/default/price`
- **参数**: 无
- **返回类型**: `CoinPrice`

#### checkWebsite
- **方法**: POST
- **URL**: `/v5/default/check-website`
- **参数**: `{ website: string }`
- **返回类型**: `{ isScammer: boolean; warning: string }`

### 地址相关

#### getAddressSummary
- **方法**: GET
- **URL**: `/v5/address/summary`
- **参数**: `{ address: string }`
- **返回类型**: `AddressSummary`

#### getAddressBalance
- **方法**: GET
- **URL**: `/v5/address/balance`
- **参数**: `{ address: string }`
- **返回类型**: `BitcoinBalance`

#### getAddressBalanceV2
- **方法**: GET
- **URL**: `/v5/address/balance2`
- **参数**: `{ address: string }`
- **返回类型**: `BitcoinBalanceV2`

#### getMultiAddressAssets
- **方法**: GET
- **URL**: `/v5/address/multi-assets`
- **参数**: `{ addresses: string }`
- **返回类型**: `AddressSummary[]`

#### findGroupAssets
- **方法**: POST
- **URL**: `/v5/address/find-group-assets`
- **参数**: `{ groups: { type: number; address_arr: string[] }[] }`
- **返回类型**: `{ type: number; address_arr: string[]; satoshis_arr: number[] }[]`

#### getAvailableUtxos (已弃用)
- **方法**: GET
- **URL**: `/v5/address/available-utxo`
- **参数**: `{ address: string, ignoreAssets: boolean }`
- **返回类型**: `UTXO[]`

#### getUnavailableUtxos (已弃用)
- **方法**: GET
- **URL**: `/v5/address/unavailable-utxo`
- **参数**: `{ address: string }`
- **返回类型**: `UTXO[]`

#### getBTCUtxos
- **方法**: GET
- **URL**: `/v5/address/btc-utxo`
- **参数**: `{ address: string }`
- **返回类型**: `UTXO[]`

#### getAddressInscriptions
- **方法**: GET
- **URL**: `/v5/address/inscriptions`
- **参数**: `{ address: string, cursor: number, size: number }`
- **返回类型**: `{ list: Inscription[]; total: number }`

#### getAddressRecentHistory
- **方法**: GET
- **URL**: `/v5/address/history`
- **参数**: `{ address: string, start: number, limit: number }`
- **返回类型**: `any`

### 铭文相关

#### getInscriptionUtxo
- **方法**: GET
- **URL**: `/v5/inscription/utxo`
- **参数**: `{ inscriptionId: string }`
- **返回类型**: `UTXO`

#### getInscriptionUtxoDetail
- **方法**: GET
- **URL**: `/v5/inscription/utxo-detail`
- **参数**: `{ inscriptionId: string }`
- **返回类型**: `UTXO_Detail`

#### getInscriptionUtxos
- **方法**: POST
- **URL**: `/v5/inscription/utxos`
- **参数**: `{ inscriptionIds: string[] }`
- **返回类型**: `UTXO[]`

#### getInscriptionInfo
- **方法**: GET
- **URL**: `/v5/inscription/info`
- **参数**: `{ inscriptionId: string }`
- **返回类型**: `Inscription`

#### getDomainInfo
- **方法**: GET
- **URL**: `/v5/address/search`
- **参数**: `{ domain: string }`
- **返回类型**: `Inscription`

### 发现相关

#### getAppList
- **方法**: GET
- **URL**: `/v5/discovery/app-list`
- **参数**: 无
- **返回类型**: `{ tab: string; items: AppInfo[] }[]`

#### getBannerList
- **方法**: GET
- **URL**: `/v5/discovery/banner-list`
- **参数**: 无
- **返回类型**: `{ id: string; img: string; link: string }[]`

### 交易相关

#### pushTx
- **方法**: POST
- **URL**: `/v5/tx/broadcast`
- **参数**: `{ rawtx: string }`
- **返回类型**: `string`

#### decodePsbt
- **方法**: POST
- **URL**: `/v5/tx/decode2`
- **参数**: `{ psbtHex: string, website: string }`
- **返回类型**: `DecodedPsbt`

#### decodeContracts
- **方法**: POST
- **URL**: `/v5/tx/decode-contracts`
- **参数**: `{ contracts: any[], account: any }`
- **返回类型**: `any`

#### createSendCoinBypassHeadOffsets
- **方法**: POST
- **URL**: `/v5/tx/create-send-btc`
- **参数**: `{ fromAddress: string, fromPubkey: string, tos: { address: string; satoshis: number }[], feeRate: number, bypassHeadOffsets: boolean }`
- **返回类型**: `{ psbtBase64: string; toSignInputs: ToSignInput[] }`

### BRC20 相关

#### inscribeBRC20Transfer
- **方法**: POST
- **URL**: `/v5/brc20/inscribe-transfer`
- **参数**: `{ address: string, tick: string, amount: string, feeRate: number, outputValue: number }`
- **返回类型**: `InscribeOrder`

#### getInscribeResult
- **方法**: GET
- **URL**: `/v5/brc20/order-result`
- **参数**: `{ orderId: string }`
- **返回类型**: `TokenTransfer`

#### getBRC20List
- **方法**: GET
- **URL**: `/v5/brc20/list`
- **参数**: `{ address: string, cursor: number, size: number }`
- **返回类型**: `{ list: TokenBalance[]; total: number }`

#### getBRC20List5Byte
- **方法**: GET
- **URL**: `/v5/brc20/5byte-list`
- **参数**: `{ address: string, cursor: number, size: number, type: number }`
- **返回类型**: `{ list: TokenBalance[]; total: number }`

#### getAddressTokenSummary
- **方法**: GET
- **URL**: `/v5/brc20/token-summary`
- **参数**: `{ address: string, ticker: string }`
- **返回类型**: `AddressTokenSummary`

#### getTokenTransferableList
- **方法**: GET
- **URL**: `/v5/brc20/transferable-list`
- **参数**: `{ address: string, ticker: string, cursor: number, size: number }`
- **返回类型**: `{ list: TokenTransfer[]; total: number }`

#### getBrc20sPrice
- **方法**: POST
- **URL**: `/v5/market/brc20/price`
- **参数**: `{ ticks: string[], nftType: string }`
- **返回类型**: `{ [ticker: string]: TickPriceItem }`

#### singleStepTransferBRC20Step1
- **方法**: POST
- **URL**: `/v5/brc20/single-step-transfer/request-commit`
- **参数**: `{ userAddress: string, userPubkey: string, receiver: string, ticker: string, amount: string, feeRate: number }`
- **返回类型**: `{ orderId: string; psbtHex: string; toSignInputs: UserToSignInput[] }`

#### singleStepTransferBRC20Step2
- **方法**: POST
- **URL**: `/v5/brc20/single-step-transfer/sign-commit`
- **参数**: `{ orderId: string, psbt: string }`
- **返回类型**: `{ psbtHex: string; toSignInputs: UserToSignInput[] }`

#### singleStepTransferBRC20Step3
- **方法**: POST
- **URL**: `/v5/brc20/single-step-transfer/sign-reveal`
- **参数**: `{ orderId: string, psbt: string }`
- **返回类型**: `{ txid: string }`

### 购买相关

#### getBuyCoinChannelList
- **方法**: GET
- **URL**: `/v5/buy-btc/channel-list` 或 `/v5/buy-fb/channel-list`
- **参数**: 无
- **返回类型**: `{ channel: string }[]`

#### createBuyCoinPaymentUrl
- **方法**: POST
- **URL**: `/v5/buy-btc/create` 或 `/v5/buy-fb/create`
- **参数**: `{ address: string, channel: string }`
- **返回类型**: `string`

### Ordinals 相关

#### getOrdinalsInscriptions
- **方法**: GET
- **URL**: `/v5/ordinals/inscriptions`
- **参数**: `{ address: string, cursor: number, size: number }`
- **返回类型**: `{ list: Inscription[]; total: number }`

### Atomicals 相关

#### getAtomicalsNFT
- **方法**: GET
- **URL**: `/v5/atomicals/nft`
- **参数**: `{ address: string, cursor: number, size: number }`
- **返回类型**: `{ list: Inscription[]; total: number }`

#### getAtomicalsUtxo
- **方法**: GET
- **URL**: `/v5/atomicals/utxo`
- **参数**: `{ atomicalId: string }`
- **返回类型**: `UTXO`

### ARC20 相关

#### getArc20BalanceList
- **方法**: GET
- **URL**: `/v5/arc20/balance-list`
- **参数**: `{ address: string, cursor: number, size: number }`
- **返回类型**: `{ list: Arc20Balance[]; total: number }`

#### getArc20Utxos
- **方法**: GET
- **URL**: `/v5/arc20/utxos`
- **参数**: `{ address: string, ticker: string }`
- **返回类型**: `UTXO[]`

### 版本相关

#### getVersionDetail
- **方法**: GET
- **URL**: `/v5/version/detail`
- **参数**: `{ version: string }`
- **返回类型**: `VersionDetail`

### Runes 相关

#### getRunesList
- **方法**: GET
- **URL**: `/v5/runes/list`
- **参数**: `{ address: string, cursor: number, size: number }`
- **返回类型**: `{ list: RuneBalance[]; total: number }`

#### getRunesUtxos
- **方法**: GET
- **URL**: `/v5/runes/utxos`
- **参数**: `{ address: string, runeid: string }`
- **返回类型**: `UTXO[]`

#### getAddressRunesTokenSummary
- **方法**: GET
- **URL**: `/v5/runes/token-summary`
- **参数**: `{ address: string, runeid: string }`
- **返回类型**: `AddressRunesTokenSummary`

#### getRunesPrice
- **方法**: POST
- **URL**: `/v5/market/runes/price`
- **参数**: `{ ticks: string[], nftType: string }`
- **返回类型**: `{ [ticker: string]: TickPriceItem }`

### CAT20 相关

#### getCAT20List
- **方法**: GET
- **URL**: `/v5/cat20/list`
- **参数**: `{ address: string, cursor: number, size: number }`
- **返回类型**: `{ list: CAT20Balance[]; total: number }`

#### getAddressCAT20TokenSummary
- **方法**: GET
- **URL**: `/v5/cat20/token-summary`
- **参数**: `{ address: string, tokenId: string }`
- **返回类型**: `any`

#### getAddressCAT20UtxoSummary
- **方法**: GET
- **URL**: `/v5/cat20/utxo-summary`
- **参数**: `{ address: string, tokenId: string }`
- **返回类型**: `any`

#### transferCAT20Step1
- **方法**: POST
- **URL**: `/v5/cat20/transfer-token-step1`
- **参数**: `{ address: string, pubkey: string, to: string, tokenId: string, amount: string, feeRate: number }`
- **返回类型**: `any`

#### transferCAT20Step2
- **方法**: POST
- **URL**: `/v5/cat20/transfer-token-step2`
- **参数**: `{ id: string, psbt: string }`
- **返回类型**: `any`

#### transferCAT20Step3
- **方法**: POST
- **URL**: `/v5/cat20/transfer-token-step3`
- **参数**: `{ id: string, psbt: string }`
- **返回类型**: `any`

#### transferCAT20Step1ByMerge
- **方法**: POST
- **URL**: `/v5/cat20/transfer-token-step1-by-merge`
- **参数**: `{ mergeId: string }`
- **返回类型**: `any`

#### mergeCAT20Prepare
- **方法**: POST
- **URL**: `/v5/cat20/merge-token-prepare`
- **参数**: `{ address: string, pubkey: string, tokenId: string, utxoCount: number, feeRate: number }`
- **返回类型**: `any`

#### getMergeCAT20Status
- **方法**: POST
- **URL**: `/v5/cat20/merge-token-status`
- **参数**: `{ id: string }`
- **返回类型**: `any`

#### getCAT20sPrice
- **方法**: POST
- **URL**: `/v5/market/cat20/price`
- **参数**: `{ tokenIds: string[] }`
- **返回类型**: `{ [ticker: string]: TickPriceItem }`

### CAT721 相关

#### getCAT721CollectionList
- **方法**: GET
- **URL**: `/v5/cat721/collection/list`
- **参数**: `{ address: string, cursor: number, size: number }`
- **返回类型**: `{ list: CAT721CollectionInfo[]; total: number }`

#### getAddressCAT721CollectionSummary
- **方法**: GET
- **URL**: `/v5/cat721/collection-summary`
- **参数**: `{ address: string, collectionId: string }`
- **返回类型**: `any`

#### transferCAT721Step1
- **方法**: POST
- **URL**: `/v5/cat721/transfer-nft-step1`
- **参数**: `{ address: string, pubkey: string, to: string, collectionId: string, localId: string, feeRate: number }`
- **返回类型**: `any`

#### transferCAT721Step2
- **方法**: POST
- **URL**: `/v5/cat721/transfer-nft-step2`
- **参数**: `{ id: string, psbt: string }`
- **返回类型**: `any`

#### transferCAT721Step3
- **方法**: POST
- **URL**: `/v5/cat721/transfer-nft-step3`
- **参数**: `{ id: string, psbt: string }`
- **返回类型**: `any`

### Babylon 相关

#### getBabylonConfig
- **方法**: GET
- **URL**: `/v5/babylon/config`
- **参数**: 无
- **返回类型**: `BabylonConfigV2`

### Alkanes 相关

#### getAlkanesList
- **方法**: GET
- **URL**: `/v5/alkanes/list`
- **参数**: `{ address: string, cursor: number, size: number }`
- **返回类型**: `{ list: AlkanesBalance[]; total: number }`

#### getAlkanesUtxos
- **方法**: GET
- **URL**: `/v5/alkanes/utxos`
- **参数**: `{ address: string, alkaneid: string }`
- **返回类型**: `UTXO[]`

#### getAddressAlkanesTokenSummary
- **方法**: GET
- **URL**: `/v5/alkanes/token-summary`
- **参数**: `{ address: string, alkaneid: string, fetchAvailable: boolean }`
- **返回类型**: `AddressAlkanesTokenSummary`

#### getAlkanesCollectionList
- **方法**: GET
- **URL**: `/v5/alkanes/collection/list`
- **参数**: `{ address: string, cursor: number, size: number }`
- **返回类型**: `{ list: AlkanesCollection[]; total: number }`

#### getAlkanesCollectionItems
- **方法**: GET
- **URL**: `/v5/alkanes/collection/items`
- **参数**: `{ address: string, collectionId: string, cursor: number, size: number }`
- **返回类型**: `{ list: AlkanesInfo[]; total: number }`

#### createAlkanesSendTx
- **方法**: POST
- **URL**: `/v5/alkanes/create-send-tx`
- **参数**: `{ userAddress: string, userPubkey: string, receiver: string, alkaneid: string, amount: string, feeRate: number }`
- **返回类型**: `{ orderId: string; psbtHex: string; toSignInputs: UserToSignInput[] }`

#### getAlkanesPrice
- **方法**: POST
- **URL**: `/v5/market/alkanes/price`
- **参数**: `{ ticks: string[], nftType: string }`
- **返回类型**: `{ [ticker: string]: TickPriceItem }`

## 数据类型说明

本文档中使用的数据类型定义在 `@/shared/types` 中，具体接口定义如下：

### WalletConfig
```typescript
interface WalletConfig {
  version: string;
  moonPayEnabled: boolean;
  statusMessage: string;
  endpoint: string;
  chainTip: string;
  disableUtxoTools: boolean;
}
```

### AddressSummary
```typescript
interface AddressSummary {
  address: string;
  totalSatoshis: number;
  btcSatoshis: number;
  assetSatoshis: number;
  inscriptionCount: number;
  atomicalsCount: number;
  brc20Count: number;
  brc20Count5Byte: number;
  arc20Count: number;
  runesCount: number;
  loading?: boolean;
}
```

### BitcoinBalance
```typescript
interface BitcoinBalance {
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
```

### BitcoinBalanceV2
```typescript
interface BitcoinBalanceV2 {
  availableBalance: number;
  unavailableBalance: number;
  totalBalance: number;
}
```

### UTXO
```typescript
interface UTXO {
  txid: string;
  vout: number;
  satoshis: number;
  scriptPk: string;
  addressType: AddressType;
  inscriptions: {
    inscriptionId: string;
    inscriptionNumber?: number;
    offset: number;
  }[];
  atomicals: {
    atomicalId: string;
    atomicalNumber: number;
    type: 'NFT' | 'FT';
    ticker?: string;
    atomicalValue?: number;
  }[];
  runes: {
    runeid: string;
    rune: string;
    amount: string;
  }[];
}
```

### UTXO_Detail
```typescript
interface UTXO_Detail {
  txId: string;
  outputIndex: number;
  satoshis: number;
  scriptPk: string;
  addressType: AddressType;
  inscriptions: Inscription[];
}
```

### Inscription
```typescript
interface Inscription {
  inscriptionId: string;
  inscriptionNumber: number;
  address: string;
  outputValue: number;
  preview: string;
  content: string;
  contentType: string;
  contentLength: number;
  timestamp: number;
  genesisTransaction: string;
  location: string;
  output: string;
  offset: number;
  contentBody: string;
  utxoHeight: number;
  utxoConfirmation: number;
  brc20?: {
    op: string;
    tick: string;
    lim: string;
    amt: string;
    decimal: string;
  };
  multipleNFT?: boolean;
  sameOffset?: boolean;
  children?: string[];
  parents?: string[];
}
```

### TokenBalance
```typescript
interface TokenBalance {
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
```

### TokenTransfer
```typescript
interface TokenTransfer {
  ticker: string;
  amount: string;
  inscriptionId: string;
  inscriptionNumber: number;
  timestamp: number;
  confirmations: number;
  satoshi: number;
}
```

### UserToSignInput
```typescript
type UserToSignInput = AddressUserToSignInput | PublicKeyUserToSignInput;

interface AddressUserToSignInput extends BaseUserToSignInput {
  address: string;
}

interface PublicKeyUserToSignInput extends BaseUserToSignInput {
  publicKey: string;
}

interface BaseUserToSignInput {
  index: number;
  sighashTypes: number[] | undefined;
  useTweakedSigner?: boolean;
  disableTweakSigner?: boolean;
  tapLeafHashToSign?: string;
}
```

### ToSignInput
```typescript
interface ToSignInput {
  index: number;
  publicKey: string;
  sighashTypes?: number[];
  tapLeafHashToSign?: Buffer;
}
```

### CoinPrice
```typescript
interface CoinPrice {
  btc: number;
  fb: number;
}
```

### TickPriceItem
```typescript
type TickPriceItem = {
  curPrice: number;
  changePercent: number;
};
```

### DecodedPsbt
```typescript
interface DecodedPsbt {
  inputInfos: {
    txid: string;
    vout: number;
    address: string;
    value: number;
    inscriptions: Inscription[];
    atomicals: Atomical[];
    sighashType: number;
    runes: RuneBalance[];
    contract?: ContractResult;
  }[];
  outputInfos: {
    address: string;
    value: number;
    inscriptions: Inscription[];
    atomicals: Atomical[];
    runes: RuneBalance[];
    contract?: ContractResult;
  }[];
  inscriptions: { [key: string]: Inscription };
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
```

### FeeSummary
```typescript
interface FeeSummary {
  list: {
    title: string;
    desc: string;
    feeRate: number;
  }[];
}
```

### InscribeOrder
```typescript
interface InscribeOrder {
  orderId: string;
  payAddress: string;
  totalFee: number;
  minerFee: number;
  originServiceFee: number;
  serviceFee: number;
  outputValue: number;
}
```

### InscriptionSummary
```typescript
interface InscriptionSummary {
  mintedList: InscriptionMintedItem[];
}

interface InscriptionMintedItem {
  title: string;
  desc: string;
  inscriptions: Inscription[];
}
```

### AppSummary
```typescript
interface AppSummary {
  apps: AppInfo[];
  readTabTime?: number;
}
```

### AppInfo
```typescript
interface AppInfo {
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
```

### Arc20Balance
```typescript
interface Arc20Balance {
  ticker: string;
  balance: number;
  confirmedBalance: number;
  unconfirmedBalance: number;
}
```

### CAT20Balance
```typescript
interface CAT20Balance {
  tokenId: string;
  amount: string;
  name: string;
  symbol: string;
  decimals: number;
}
```

### CAT721CollectionInfo
```typescript
interface CAT721CollectionInfo {
  collectionId: string;
  name: string;
  symbol: string;
  max: string;
  premine: string;
  description: string;
  contentType: string;
}
```

### RuneBalance
```typescript
interface RuneBalance {
  amount: string;
  runeid: string;
  rune: string;
  spacedRune: string;
  symbol: string;
  divisibility: number;
}
```

### AlkanesBalance
```typescript
interface AlkanesBalance {
  amount: string;
  alkaneid: string;
  name: string;
  symbol: string;
  divisibility: number;
  available: string;
}
```

### AlkanesCollection
```typescript
interface AlkanesCollection {
  alkaneid: string;
  name: string;
  count: number;
  image: string;
}
```

### AlkanesInfo
```typescript
interface AlkanesInfo {
  alkaneid: string;
  name: string;
  symbol: string;
  spacers?: number;
  divisibility?: number;
  height?: number;
  totalSupply: string;
  cap: number;
  minted: number;
  mintable: boolean;
  perMint: string;
  holders: number;
  timestamp?: number;
  type?: string;
  maxSupply?: string;
  premine?: string;
  aligned?: boolean;
  nftData?: {
    collectionId: string;
    attributes?: any;
    contentType?: string;
    image?: string;
    contentUrl?: string;
  };
  logo?: string;
  collectionData?: {
    holders: number;
  };
}
```

### AddressTokenSummary
```typescript
interface AddressTokenSummary {
  tokenInfo: TokenInfo;
  tokenBalance: TokenBalance;
  historyList: TokenTransfer[];
  transferableList: TokenTransfer[];
}

interface TokenInfo {
  totalSupply: string;
  totalMinted: string;
  decimal: number;
  holder: string;
  inscriptionId: string;
  selfMint?: boolean;
  holdersCount: number;
  historyCount: number;
}
```

### AddressRunesTokenSummary
```typescript
interface AddressRunesTokenSummary {
  runeInfo: RuneInfo;
  runeBalance: RuneBalance;
  runeLogo?: Inscription;
}

interface RuneInfo {
  runeid: string;
  rune: string;
  spacedRune: string;
  number: number;
  height: number;
  txidx: number;
  timestamp: number;
  divisibility: number;
  symbol: string;
  etching: string;
  premine: string;
  terms: {
    amount: string;
    cap: string;
    heightStart: number;
    heightEnd: number;
    offsetStart: number;
    offsetEnd: number;
  };
  mints: string;
  burned: string;
  holders: number;
  transactions: number;
  mintable: boolean;
  remaining: string;
  start: number;
  end: number;
  supply: string;
  parent?: string;
}
```

### AddressAlkanesTokenSummary
```typescript
interface AddressAlkanesTokenSummary {
  tokenInfo: AlkanesInfo;
  tokenBalance: AlkanesBalance;
  tradeUrl?: string;
  mintUrl?: string;
}
```

### VersionDetail
```typescript
interface VersionDetail {
  version: string;
  title: string;
  changelogs: string[];
  notice: string;
}
```

### BabylonConfigV2
```typescript
interface BabylonConfigV2 {
  chainId: string;
  phase1: {
    state: BabylonPhaseState;
    title: string;
    stakingUrl: string;
    stakingApi: string;
  };
  phase2: {
    state: BabylonPhaseState;
    title: string;
    stakingUrl: string;
    stakingApi: string;
    stakingStatus: {
      active_tvl: number;
      active_delegations: number;
      active_stakers: number;
      active_finality_providers: number;
      total_finality_providers: number;
    };
  };
  showClaimed?: boolean;
}

enum BabylonPhaseState {
  NONE,
  PENDING,
  ACTIVE,
  CLOSED
}
```

### 其他相关类型

#### Atomical
```typescript
interface Atomical {
  atomicalId: string;
  atomicalNumber: number;
  type: 'FT' | 'NFT';
  ticker?: string;
  atomicalValue: number;
  address: string;
  outputValue: number;
  preview: string;
  content: string;
  contentType: string;
  contentLength: number;
  timestamp: number;
  genesisTransaction: string;
  location: string;
  output: string;
  offset: number;
  contentBody: string;
  utxoHeight: number;
  utxoConfirmation: number;
}
```

#### Risk
```typescript
interface Risk {
  type: RiskType;
  level: 'danger' | 'warning' | 'critical';
  title: string;
  desc: string;
}

enum RiskType {
  SIGHASH_NONE,
  SCAMMER_ADDRESS,
  UNCONFIRMED_UTXO,
  INSCRIPTION_BURNING,
  ATOMICALS_DISABLE,
  ATOMICALS_NFT_BURNING,
  ATOMICALS_FT_BURNING,
  MULTIPLE_ASSETS,
  LOW_FEE_RATE,
  HIGH_FEE_RATE,
  SPLITTING_INSCRIPTIONS,
  MERGING_INSCRIPTIONS,
  CHANGING_INSCRIPTION,
  RUNES_BURNING
}
```

#### ContractResult
```typescript
interface ContractResult {
  id: string;
  name: string;
  description: string;
  address: string;
  script: string;
  isOwned: boolean;
}
```
