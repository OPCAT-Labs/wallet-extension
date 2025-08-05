import { ethErrors } from 'eth-rpc-errors';

import { OpcatProvider } from './index';
import ReadyPromise from '@/content-script/pageProvider/readyPromise';
import BroadcastChannelMessage from '@/shared/utils/message/broadcastChannelMessage';

class PushEventHandlers {
  provider: OpcatProvider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _opcatProviderPrivate:any;

  constructor(provider, _opcatProviderPrivate: {
    _selectedAddress: string | null;
    _network: string | null;
    _isConnected: boolean;
    _initialized: boolean;
    _isUnlocked: boolean;
    _pushEventHandlers: PushEventHandlers | null;
    _requestPromise: ReadyPromise;
    _bcm: BroadcastChannelMessage
  }) {
    this.provider = provider;
    this._opcatProviderPrivate = _opcatProviderPrivate;
  }

  _emit(event, data) {
    if (this._opcatProviderPrivate._initialized) {
      this.provider.emit(event, data);
    }
  }

  connect = (data) => {
    if (!this._opcatProviderPrivate._isConnected) {
      this._opcatProviderPrivate._isConnected = true;
      this._opcatProviderPrivate._state.isConnected = true;
      this._emit('connect', data);
    }
  };

  unlock = () => {
    this._opcatProviderPrivate._isUnlocked = true;
    this._opcatProviderPrivate._state.isUnlocked = true;
  };

  lock = () => {
    this._opcatProviderPrivate._isUnlocked = false;
  };

  disconnect = () => {
    this._opcatProviderPrivate._isConnected = false;
    this._opcatProviderPrivate._state.isConnected = false;
    this._opcatProviderPrivate._state.accounts = null;
    this._opcatProviderPrivate._selectedAddress = null;
    const disconnectError = ethErrors.provider.disconnected();

    this._emit('accountsChanged', []);
    this._emit('disconnect', disconnectError);
    this._emit('close', disconnectError);
  };

  accountsChanged = (accounts: string[]) => {
    if (accounts?.[0] === this._opcatProviderPrivate._selectedAddress) {
      return;
    }

    this._opcatProviderPrivate._selectedAddress = accounts?.[0];
    this._opcatProviderPrivate._state.accounts = accounts;
    this._emit('accountsChanged', accounts);
  };

  networkChanged = ({ network }) => {
    this.connect({});

    if (network !== this._opcatProviderPrivate._network) {
      this._opcatProviderPrivate._network = network;
      this._emit('networkChanged', network);
    }
  };
}

export default PushEventHandlers;
