import { browserRuntimeConnect } from '@/background/webapi/browser';

import Message from './index';

class PortMessage extends Message {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  port: any | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listenCallback: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(port?: any) {
    super();

    if (port) {
      this.port = port;
    }
  }

  connect = (name?: string) => {
    this.port = browserRuntimeConnect(undefined, name ? { name } : undefined);
    this.port.onMessage.addListener(({ _type_, data }) => {
      if (_type_ === `${this._EVENT_PRE}message`) {
        this.emit('message', data);
        return;
      }

      if (_type_ === `${this._EVENT_PRE}response`) {
        this.onResponse(data);
      }
    });

    return this;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listen = (listenCallback: any) => {
    if (!this.port) return;
    this.listenCallback = listenCallback;
    this.port.onMessage.addListener(({ _type_, data }) => {
      if (_type_ === `${this._EVENT_PRE}request`) {
        this.onRequest(data);
      }
    });

    return this;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send = (type, data) => {
    if (!this.port) return;
    try {
      this.port.postMessage({ _type_: `${this._EVENT_PRE}${type}`, data });
    } catch (e) {
      // DO NOTHING BUT CATCH THIS ERROR
    }
  };

  dispose = () => {
    this._dispose();
    this.port?.disconnect();
  };
}

export default PortMessage;
