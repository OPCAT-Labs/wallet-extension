import randomstring from 'randomstring';

import { createPersistStore } from '@/background/utils';
import { CHAINS_MAP, CHANNEL, VERSION, X_CLIENT_HEADER } from '@/shared/constant';
import { getCurrentLocaleAsync } from '@/shared/modules/i18n';
import {
  AddressSummary,
  AddressTokenSummary,
  AppInfo,
  AppSummary,
  BitcoinBalance,
  BitcoinBalanceV2,
  CAT20Balance,
  CAT721CollectionInfo,
  CoinPrice,
  DecodedPsbt,
  FeeSummary,
  TickPriceItem,
  TokenTransfer,
  UTXO,
  VersionDetail,
  WalletConfig
} from '@/shared/types';
import { ToSignInput } from '@unisat/wallet-sdk';

import { preferenceService } from '.';

interface OpenApiStore {
  deviceId: string;
  config?: WalletConfig;
}

enum API_STATUS {
  FAILED = -1,
  SUCCESS = 0
}

export class OpenApiService {
  store!: OpenApiStore;
  clientAddress = '';
  addressFlag = 0;
  endpoints: string[] = [];
  endpoint = '';
  config: WalletConfig | null = null;

  setEndpoints = async (endpoints: string[]) => {
    this.endpoints = endpoints;
    await this.init();
  };

  init = async () => {
    this.store = await createPersistStore({
      name: 'openapi',
      template: {
        deviceId: randomstring.generate(12)
      }
    });

    const chainType = preferenceService.getChainType();
    const chain = CHAINS_MAP[chainType];
    this.endpoint = chain.endpoints[0];

    if (!this.store.deviceId) {
      this.store.deviceId = randomstring.generate(12);
    }

    try {
      const config = await this.getWalletConfig();
      this.config = config;
      if (config.endpoint && config.endpoint !== this.endpoint) {
        this.endpoint = config.endpoint;
      }
    } catch (e) {
      console.error(e);
    }
  };

  setClientAddress = async (token: string, flag: number) => {
    this.clientAddress = token;
    this.addressFlag = flag;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRespData = async (res: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let jsonRes: { code: number; msg: string; data: any };

    if (!res) throw new Error('Network error, no response');
    if (res.status !== 200) throw new Error('Network error with status: ' + res.status);
    try {
      jsonRes = await res.json();
    } catch (e) {
      throw new Error('Network error, json parse error');
    }
    if (!jsonRes) throw new Error('Network error,no response data');
    if (jsonRes.code !== API_STATUS.SUCCESS) {
      throw new Error(jsonRes.msg);
    }
    return jsonRes.data;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  httpGet = async (route: string, params: any) => {
    let url = this.endpoint + route;
    let c = 0;
    for (const id in params) {
      if (c == 0) {
        url += '?';
      } else {
        url += '&';
      }
      url += `${id}=${params[id]}`;
      c++;
    }

    const headers = new Headers();
    const lang = await getCurrentLocaleAsync();
    headers.append('X-Client', X_CLIENT_HEADER);
    headers.append('X-Version', VERSION);
    headers.append('x-address', this.clientAddress);
    headers.append('x-flag', this.addressFlag + '');
    headers.append('x-channel', CHANNEL);
    headers.append('x-udid', this.store.deviceId);
    headers.append('x-lang', lang);
    let res: Response;
    try {
      res = await fetch(new Request(url), { method: 'GET', headers, mode: 'cors', cache: 'default' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      throw new Error('Network error: ' + e && e.message);
    }

    return this.getRespData(res);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  httpPost = async (route: string, params: any) => {
    const url = this.endpoint + route;
    const headers = new Headers();

    const lang = await getCurrentLocaleAsync();
    headers.append('X-Client', X_CLIENT_HEADER);
    headers.append('X-Version', VERSION);
    headers.append('x-address', this.clientAddress);
    headers.append('x-flag', this.addressFlag + '');
    headers.append('x-channel', CHANNEL);
    headers.append('x-udid', this.store.deviceId);
    headers.append('x-lang', lang);
    headers.append('Content-Type', 'application/json;charset=utf-8');
    let res: Response;
    try {
      res = await fetch(new Request(url), {
        method: 'POST',
        headers,
        mode: 'cors',
        cache: 'default',
        body: JSON.stringify(params)
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      throw new Error('Network error: ' + e && e.message);
    }

    return this.getRespData(res);
  };

  async getWalletConfig(): Promise<WalletConfig> {
    return this.httpGet('/v5/default/config', {});
  }

  async getAddressSummary(address: string): Promise<AddressSummary> {
    return this.httpGet('/v5/address/summary', {
      address
    });
  }

  async getAppList(): Promise<
    {
      tab: string;
      items: AppInfo[];
    }[]
  > {
    return this.httpGet('/v5/discovery/app-list', {});
  }

  async getBannerList(): Promise<
    {
      id: string;
      img: string;
      link: string;
    }[]
  > {
    return this.httpGet('/v5/discovery/banner-list', {});
  }

  async getBlockActiveInfo(): Promise<{ allTransactions: number; allAddrs: number }> {
    return this.httpGet('/v5/default/block-active-info', {});
  }

  async getAddressBalance(address: string): Promise<BitcoinBalance> {
    return this.httpGet('/v5/address/balance', {
      address
    });
  }

  async getAddressBalanceV2(address: string): Promise<BitcoinBalanceV2> {
    return this.httpGet('/v5/address/balance2', {
      address
    });
  }

  async getMultiAddressAssets(addresses: string): Promise<AddressSummary[]> {
    return this.httpGet('/v5/address/multi-assets', {
      addresses
    });
  }

  async findGroupAssets(
    groups: { type: number; address_arr: string[] }[]
  ): Promise<{ type: number; address_arr: string[]; satoshis_arr: number[] }[]> {
    return this.httpPost('/v5/address/find-group-assets', {
      groups
    });
  }

  // deprecated
  async getAvailableUtxos(address: string): Promise<UTXO[]> {
    return this.httpGet('/v5/address/available-utxo', {
      address,
      ignoreAssets: true
    });
  }

  // deprecated
  async getUnavailableUtxos(address: string): Promise<UTXO[]> {
    return this.httpGet('/v5/address/unavailable-utxo', {
      address
    });
  }

  async getBTCUtxos(address: string): Promise<UTXO[]> {
    return this.httpGet('/v5/address/btc-utxo', {
      address
    });
  }

  async getAppSummary(): Promise<AppSummary> {
    return this.httpGet('/v5/default/app-summary-v2', {});
  }

  async pushTx(rawtx: string): Promise<string> {
    return this.httpPost('/v5/tx/broadcast', {
      rawtx
    });
  }

  async getFeeSummary(): Promise<FeeSummary> {
    return this.httpGet('/v5/default/fee-summary', {});
  }

  private priceCache: CoinPrice | null = null;
  private priceUpdateTime = 0;
  private isRefreshingCoinPrice = false;

  async refreshCoinPrice() {
    try {
      this.isRefreshingCoinPrice = true;
      const result: CoinPrice = await this.httpGet('/v5/default/price', {});

      this.priceCache = result;
      this.priceUpdateTime = Date.now();

      return result;
    } finally {
      this.isRefreshingCoinPrice = false;
    }
  }

  async getCoinPrice(): Promise<CoinPrice> {
    while (this.isRefreshingCoinPrice) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    //   30s cache
    if (this.priceCache && Date.now() - this.priceUpdateTime < 30 * 1000) {
      return this.priceCache;
    }
    // 40s return cache and refresh
    if (this.priceCache && Date.now() - this.priceUpdateTime < 40 * 1000) {
      this.refreshCoinPrice().then();
      return this.priceCache;
    }

    return this.refreshCoinPrice();
  }

  private cat20PriceCache: { [key: string]: { cacheTime: number; data: TickPriceItem } } = {};
  private currentRequestCAT20 = {};

  async getCAT20sPrice(tokenIds: string[]) {
    if (tokenIds.length < 0) {
      return {};
    }
    const tickLine = tokenIds.join('');
    if (!tickLine) return {};

    try {
      while (this.currentRequestCAT20[tickLine]) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      this.currentRequestCAT20[tickLine] = true;

      const result = {} as { [key: string]: TickPriceItem };

      for (let i = 0; i < tokenIds.length; i += 1) {
        const tokenId = tokenIds[i];
        const cache = this.cat20PriceCache[tokenId];
        if (!cache) {
          break;
        }
        if (cache.cacheTime + 5 * 60 * 1000 > Date.now()) {
          result[tokenId] = cache.data;
        }
      }

      if (Object.keys(result).length === tokenIds.length) {
        return result;
      }

      const resp: { [ticker: string]: TickPriceItem } = await this.httpPost('/v5/market/cat20/price', {
        tokenIds
      });

      for (let i = 0; i < tokenIds.length; i += 1) {
        const tokenId = tokenIds[i];
        this.cat20PriceCache[tokenId] = { cacheTime: Date.now(), data: resp[tokenId] };
      }
      return resp;
    } finally {
      this.currentRequestCAT20[tickLine] = false;
    }
  }


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getDomainInfo(domain: string): Promise<any> {
    return this.httpGet('/v5/address/search', { domain });
  }

  async getAddressTokenSummary(address: string, ticker: string): Promise<AddressTokenSummary> {
    return this.httpGet('/v5/brc20/token-summary', { address, ticker: encodeURIComponent(ticker) });
  }

  async getTokenTransferableList(
    address: string,
    ticker: string,
    cursor: number,
    size: number
  ): Promise<{ list: TokenTransfer[]; total: number }> {
    return this.httpGet('/v5/brc20/transferable-list', {
      address,
      ticker: encodeURIComponent(ticker),
      cursor,
      size
    });
  }

  async decodePsbt(psbtHex: string, website: string): Promise<DecodedPsbt> {
    return this.httpPost('/v5/tx/decode2', { psbtHex, website });
  }

  async getBuyCoinChannelList(coin: 'BTC' | 'FB'): Promise<{ channel: string }[]> {
    if (coin === 'BTC') {
      return this.httpGet('/v5/buy-btc/channel-list', {});
    } else {
      return this.httpGet('/v5/buy-fb/channel-list', {});
    }
  }

  async createBuyCoinPaymentUrl(coin: 'BTC' | 'FB', address: string, channel: string): Promise<string> {
    if (coin === 'BTC') {
      return this.httpPost('/v5/buy-btc/create', { address, channel });
    } else {
      return this.httpPost('/v5/buy-fb/create', { address, channel });
    }
  }

  async checkWebsite(website: string): Promise<{ isScammer: boolean; warning: string }> {
    return this.httpPost('/v5/default/check-website', { website });
  }

  async getVersionDetail(version: string): Promise<VersionDetail> {
    return this.httpGet('/v5/version/detail', {
      version
    });
  }

  async getAddressRecentHistory(params: { address: string; start: number; limit: number }) {
    return this.httpGet('/v5/address/history', params);
  }

  async getCAT20List(address: string, cursor: number, size: number): Promise<{ list: CAT20Balance[]; total: number }> {
    return this.httpGet('/v5/cat20/list', { address, cursor, size });
  }

  async getAddressCAT20TokenSummary(address: string, tokenId: string) {
    return this.httpGet(`/v5/cat20/token-summary?address=${address}&tokenId=${tokenId}`, {});
  }

  async getAddressCAT20UtxoSummary(address: string, tokenId: string) {
    return this.httpGet(`/v5/cat20/utxo-summary?address=${address}&tokenId=${tokenId}`, {});
  }

  async transferCAT20Step1(address: string, pubkey: string, to: string, tokenId: string, amount: string, feeRate: number) {
    return this.httpPost('/v5/cat20/transfer-token-step1', {
      address,
      pubkey,
      to,
      tokenId,
      amount,
      feeRate
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async transferCAT20Step2(transferData: any, signedPsbt: string) {
    return this.httpPost('/v5/cat20/transfer-token-step2', {
      transferData,
      psbt: signedPsbt
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async transferCAT20Step3(transferData: any, signedPsbt: string) {
    return this.httpPost('/v5/cat20/transfer-token-step3', {
      transferData,
      psbt: signedPsbt
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async transferCAT20Step1ByMerge(mergeData: any, batchIndex: number) {
    return this.httpPost('/v5/cat20/transfer-token-step1-by-merge', {
      mergeData,
      batchIndex
    });
  }

  async mergeCAT20Prepare(address: string, pubkey: string, tokenId: string, utxoCount: number, feeRate: number) {
    return this.httpPost('/v5/cat20/merge-token-prepare', {
      address,
      pubkey,
      tokenId,
      utxoCount,
      feeRate
    });
  }

  async getCAT721CollectionList(
    address: string,
    cursor: number,
    size: number
  ): Promise<{ list: CAT721CollectionInfo[]; total: number }> {
    return this.httpGet('/v5/cat721/collection/list', { address, cursor, size });
  }

  async getAddressCAT721CollectionSummary(address: string, collectionId: string) {
    return this.httpGet(`/v5/cat721/collection-summary?address=${address}&collectionId=${collectionId}`, {});
  }

  async transferCAT721Step1(
    address: string,
    pubkey: string,
    to: string,
    collectionId: string,
    localId: string,
    feeRate: number
  ) {
    return this.httpPost('/v5/cat721/transfer-nft-step1', {
      address,
      pubkey,
      to,
      collectionId,
      localId,
      feeRate
    });
  }

  async transferCAT721Step2(transferId: string, signedPsbt: string) {
    return this.httpPost('/v5/cat721/transfer-nft-step2', {
      id: transferId,
      psbt: signedPsbt
    });
  }

  async transferCAT721Step3(transferId: string, signedPsbt: string) {
    return this.httpPost('/v5/cat721/transfer-nft-step3', {
      id: transferId,
      psbt: signedPsbt
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async decodeContracts(contracts: any[], account: any): Promise<any> {
    return this.httpPost('/v5/tx/decode-contracts', { contracts, account });
  }

  async createSendCoinBypassHeadOffsets(
    address: string,
    pubkey: string,
    tos: { address: string; satoshis: number }[],
    feeRate: number
  ): Promise<{
    psbtBase64: string;
    toSignInputs: ToSignInput[];
  }> {
    return this.httpPost('/v5/tx/create-send-btc', {
      fromAddress: address,
      fromPubkey: pubkey,
      tos,
      feeRate,
      bypassHeadOffsets: true
    });
  }
}

export default new OpenApiService();
