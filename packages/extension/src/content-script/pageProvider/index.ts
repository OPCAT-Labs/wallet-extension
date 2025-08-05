// this script is injected into webpage's context
import { ethErrors, serializeError } from 'eth-rpc-errors';
import { EventEmitter } from 'events';

import {
  RequestMethodGetBitcoinUtxosParams,
  RequestMethodSendBitcoinParams,
  RequestMethodSignMessageParams,
  RequestMethodSignMessagesParams,
  TxType
} from '@/shared/types';
import BroadcastChannelMessage from '@/shared/utils/message/broadcastChannelMessage';

import { PAGE_PROVIDER_VARIABLE_NAME, PAGE_PROVIDER_VARIABLE_NAME_ALIAS, WALLET_NAME } from '@/shared/constant';
import PushEventHandlers from './pushEventHandlers';
import ReadyPromise from './readyPromise';
import { $, domReadyCall } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const log = (_event: string, ..._args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    // console.log(
    //   `%c [opcat] (${new Date().toTimeString().slice(0, 8)}) ${event}`,
    //   'font-weight: 600; background-color: #7d6ef9; color: white;',
    //   ...args
    // );
  }
};
const script = document.currentScript;
const channelName = script?.getAttribute('channel') || WALLET_NAME;

export interface Interceptor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRequest?: (data: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResponse?: (res: any, data: any) => any;
}

interface StateProvider {
  accounts: string[] | null;
  isConnected: boolean;
  isUnlocked: boolean;
  initialized: boolean;
  isPermanentlyDisconnected: boolean;
}

const _opcatPrividerPrivate: {
  _selectedAddress: string | null;
  _network: string | null;
  _isConnected: boolean;
  _initialized: boolean;
  _isUnlocked: boolean;

  _state: StateProvider;

  _pushEventHandlers: PushEventHandlers | null;
  _requestPromise: ReadyPromise;
  _bcm: BroadcastChannelMessage;
} = {
  _selectedAddress: null,
  _network: null,
  _isConnected: false,
  _initialized: false,
  _isUnlocked: false,

  _state: {
    accounts: null,
    isConnected: false,
    isUnlocked: false,
    initialized: false,
    isPermanentlyDisconnected: false
  },

  _pushEventHandlers: null,
  _requestPromise: new ReadyPromise(0),
  _bcm: new BroadcastChannelMessage(channelName)
};

let cache_origin = '';

// Create Symbol key for private methods
const requestMethodKey = Symbol('requestMethod');

export class OpcatProvider extends EventEmitter {
  constructor({ maxListeners = 100 } = {}) {
    super();
    this.setMaxListeners(maxListeners);
    this.initialize();
    _opcatPrividerPrivate._pushEventHandlers = new PushEventHandlers(this, _opcatPrividerPrivate);
  }

  private tryDetectTab = async () => {
    const origin = window.top?.location.origin;
    if (origin && cache_origin !== origin) {
      cache_origin = origin;
      const icon =
        ($('head > link[rel~="icon"]') as HTMLLinkElement)?.href ||
        ($('head > meta[itemprop="image"]') as HTMLMetaElement)?.content;

      const name = document.title || ($('head > meta[name="title"]') as HTMLMetaElement)?.content || origin;
      _opcatPrividerPrivate._bcm.request({
        method: 'tabCheckin',
        params: { icon, name }
      });
    }
  };

  initialize = async () => {
    document.addEventListener('visibilitychange', this._requestPromiseCheckVisibility);

    _opcatPrividerPrivate._bcm.connect().on('message', this._handleBackgroundMessage);

    this.tryDetectTab();
    domReadyCall(() => {
      this.tryDetectTab();
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { network, accounts, isUnlocked }: any = await this[requestMethodKey]({
        method: 'getProviderState'
      });
      if (isUnlocked) {
        _opcatPrividerPrivate._isUnlocked = true;
        _opcatPrividerPrivate._state.isUnlocked = true;
      }
      this.emit('connect', {});
      _opcatPrividerPrivate._pushEventHandlers?.networkChanged({
        network
      });

      _opcatPrividerPrivate._pushEventHandlers?.accountsChanged(accounts);
    } catch {
      //
    } finally {
      _opcatPrividerPrivate._initialized = true;
      _opcatPrividerPrivate._state.initialized = true;
      this.emit('_initialized');
    }

    this.keepAlive();
  };

  /**
   * @private
   * Sending a message to the extension to receive will keep the service worker alive.
   */
  private keepAlive = () => {
    this[requestMethodKey]({
      method: 'keepAlive',
      params: {}
    }).then(() => {
      setTimeout(() => {
        this.keepAlive();
      }, 1000);
    });
  };

  private _requestPromiseCheckVisibility = () => {
    if (document.visibilityState === 'visible') {
      _opcatPrividerPrivate._requestPromise.check(1);
    } else {
      _opcatPrividerPrivate._requestPromise.uncheck(1);
    }
  };

  private _handleBackgroundMessage = ({ event, data }) => {
    log('[push event]', event, data);
    if (_opcatPrividerPrivate._pushEventHandlers?.[event]) {
      return _opcatPrividerPrivate._pushEventHandlers[event](data);
    }

    this.emit(event, data);
  };

  // Implement truly private method using Symbol
  private [requestMethodKey] = async (data) => {
    if (!data) {
      throw ethErrors.rpc.invalidRequest();
    }

    this._requestPromiseCheckVisibility();

    return _opcatPrividerPrivate._requestPromise.call(() => {
      log('[request]', JSON.stringify(data, null, 2));
      return _opcatPrividerPrivate._bcm
        .request(data)
        .then((res) => {
          log('[request: success]', data.method, res);
          return res;
        })
        .catch((err) => {
          log('[request: error]', data.method, serializeError(err));
          throw serializeError(err);
        });
    });
  };

  // Keep _request method as a compatibility layer, but show warning
  _request = async (data) => {
    console.warn(
      `[${WALLET_NAME}] Directly accessing _request method is deprecated and will be removed in future versions. Please use the public API instead.`
    );
    return this[requestMethodKey](data);
  };

  // Modify all public methods to use Symbol method
  requestAccounts = async () => {
    return this[requestMethodKey]({
      method: 'requestAccounts'
    });
  };

  disconnect = async () => {
    return this[requestMethodKey]({
      method: 'disconnect'
    });
  };

  getNetwork = async () => {
    return this[requestMethodKey]({
      method: 'getNetwork'
    });
  };

  switchNetwork = async (network: string) => {
    return this[requestMethodKey]({
      method: 'switchNetwork',
      params: {
        network
      }
    });
  };

  getChain = async () => {
    return this[requestMethodKey]({
      method: 'getChain'
    });
  };

  switchChain = async (chain: string) => {
    return this[requestMethodKey]({
      method: 'switchChain',
      params: {
        chain
      }
    });
  };

  getAccounts = async () => {
    return this[requestMethodKey]({
      method: 'getAccounts'
    });
  };

  getPublicKey = async () => {
    return this[requestMethodKey]({
      method: 'getPublicKey'
    });
  };

  // deprecated
  getBalance = async () => {
    return this[requestMethodKey]({
      method: 'getBalance'
    });
  };

  getBalanceV2 = async () => {
    return this[requestMethodKey]({
      method: 'getBalanceV2'
    });
  };

  signMessage = async (text: string, type: string) => {
    const params: RequestMethodSignMessageParams = {
      text,
      type
    };
    return this[requestMethodKey]({
      method: 'signMessage',
      params
    });
  };

  multiSignMessage = async (messages: { text: string; type: string }[]) => {
    const params: RequestMethodSignMessagesParams = {
      messages
    };
    return this[requestMethodKey]({
      method: 'multiSignMessage',
      params
    });
  };

  verifyMessageOfBIP322Simple = async (address: string, message: string, signature: string, network?: number) => {
    return this[requestMethodKey]({
      method: 'verifyMessageOfBIP322Simple',
      params: {
        address,
        message,
        signature,
        network
      }
    });
  };

  signData = async (data: string, type: string) => {
    return this[requestMethodKey]({
      method: 'signData',
      params: {
        data,
        type
      }
    });
  };

  sendBitcoin = async (
    toAddress: string,
    satoshis: number,
    options?: { feeRate: number; memo?: string; memos?: string[] }
  ) => {
    const params: RequestMethodSendBitcoinParams = {
      sendBitcoinParams: {
        toAddress,
        satoshis,
        feeRate: options?.feeRate,
        memo: options?.memo,
        memos: options?.memos
      },
      type: TxType.SEND_BITCOIN
    };
    return this[requestMethodKey]({
      method: 'sendBitcoin',
      params
    });
  };

  /**
   * push transaction
   */
  pushTx = async (rawtx: string) => {
    return this[requestMethodKey]({
      method: 'pushTx',
      params: {
        rawtx
      }
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signPsbt = async (psbtHex: string, options?: any) => {
    return this[requestMethodKey]({
      method: 'signPsbt',
      params: {
        psbtHex,
        type: TxType.SIGN_TX,
        options
      }
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signPsbts = async (psbtHexs: string[], options?: any[]) => {
    return this[requestMethodKey]({
      method: 'multiSignPsbt',
      params: {
        psbtHexs,
        options
      }
    });
  };

  pushPsbt = async (psbtHex: string) => {
    return this[requestMethodKey]({
      method: 'pushPsbt',
      params: {
        psbtHex
      }
    });
  };

  getVersion = async () => {
    return this[requestMethodKey]({
      method: 'getVersion'
    });
  };

  // deprecated
  isAtomicalsEnabled = async () => {
    return this[requestMethodKey]({
      method: 'isAtomicalsEnabled'
    });
  };

  getBitcoinUtxos = async (cursor = 0, size = 20) => {
    const params: RequestMethodGetBitcoinUtxosParams = {
      cursor,
      size
    };
    return this[requestMethodKey]({
      method: 'getBitcoinUtxos',
      params
    });
  };
}

declare global {
  interface Window {
    [PAGE_PROVIDER_VARIABLE_NAME]: OpcatProvider;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function defineUnwritablePropertyIfPossible(o: any, p: string, value: any) {
  const descriptor = Object.getOwnPropertyDescriptor(o, p);
  if (!descriptor || descriptor.writable) {
    if (!descriptor || descriptor.configurable) {
      Object.defineProperty(o, p, {
        value,
        writable: false
      });
    } else {
      o[p] = value;
    }
  } else {
    console.warn(`Failed to inject ${p} from ${PAGE_PROVIDER_VARIABLE_NAME}. Probably, other wallet is trying to intercept ${WALLET_NAME} Wallet`);
  }
}

const provider = new OpcatProvider();
const providerProxy = new Proxy(provider, {
  deleteProperty: () => true,
  get: (target, prop) => {
    if (prop === '_events' || prop === '_eventsCount' || prop === '_maxListeners') {
      return target[prop];
    }

    // Block access to methods starting with underscore or Symbol methods
    if ((typeof prop === 'string' && prop.startsWith('_')) || prop === requestMethodKey) {
      console.warn(`[${WALLET_NAME}] Attempted access to private method: ${String(prop)} is not allowed for security reasons`);
      return undefined;
    }
    return target[prop];
  }
});

defineUnwritablePropertyIfPossible(window, PAGE_PROVIDER_VARIABLE_NAME, providerProxy);

// Many wallets occupy the window.opcat namespace, so we need to use a different namespace to avoid conflicts.
defineUnwritablePropertyIfPossible(window, PAGE_PROVIDER_VARIABLE_NAME_ALIAS, providerProxy);

window.dispatchEvent(new Event(`${PAGE_PROVIDER_VARIABLE_NAME}#initialized`));
