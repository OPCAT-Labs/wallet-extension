/**
 * this script is live in content-script / dapp's page
 */
import { ethErrors } from 'eth-rpc-errors';
import { EventEmitter } from 'events';
import { MESSAGE_EVENT_PRE } from '@/shared/constant';

abstract class Message extends EventEmitter {
  // available id list
  // max concurrent request limit
  private _requestIdPool = [...Array(500).keys()];
  protected _EVENT_PRE = MESSAGE_EVENT_PRE;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected listenCallback: any;

  private _waitingMap = new Map<
    number,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve: (arg: any) => any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reject: (arg: any) => any;
    }
  >();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract send(type: string, data: any): void;

  request = (data) => {
    if (!this._requestIdPool.length) {
      throw ethErrors.rpc.limitExceeded();
    }
    const ident = this._requestIdPool.shift()!;

    return new Promise((resolve, reject) => {
      this._waitingMap.set(ident, {
        data,
        resolve,
        reject
      });

      this.send('request', { ident, data });
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResponse = async ({ ident, res, err }: any = {}) => {
    // the url may update
    if (!this._waitingMap.has(ident)) {
      return;
    }

    const { resolve, reject } = this._waitingMap.get(ident)!;

    this._requestIdPool.push(ident);
    this._waitingMap.delete(ident);
    err ? reject(err) : resolve(res);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRequest = async ({ ident, data }) => {
    if (this.listenCallback) {
      let res, err;

      try {
        res = await this.listenCallback(data);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        err = {
          message: e.message,
          stack: e.stack
        };
        e.code && (err.code = e.code);
        e.data && (err.data = e.data);
      }

      this.send('response', { ident, res, err });
    }
  };

  _dispose = () => {
    for (const request of this._waitingMap.values()) {
      request.reject(ethErrors.provider.userRejectedRequest());
    }

    this._waitingMap.clear();
  };
}

export default Message;
