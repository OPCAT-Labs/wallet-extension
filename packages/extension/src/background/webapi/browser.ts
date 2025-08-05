import { MANIFEST_VERSION } from '@/shared/constant';

function getBrowser() {
  if (typeof globalThis.browser === 'undefined') {
    return chrome;
  } else {
    return globalThis.browser;
  }
}

const browser = getBrowser();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function browserWindowsGetCurrent(params?: any) {
  if (MANIFEST_VERSION === 'mv2') {
    return new Promise((resolve) => {
      browser.windows.getCurrent(params, (val) => {
        resolve(val);
      });
    });
  } else {
    return await browser.windows.getCurrent(params);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function browserWindowsCreate(params?: any) {
  if (MANIFEST_VERSION === 'mv2') {
    return new Promise((resolve) => {
      browser.windows.create(params, (val) => {
        resolve(val);
      });
    });
  } else {
    return await browser.windows.create(params);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function browserWindowsUpdate(windowId: number, updateInfo: any) {
  if (MANIFEST_VERSION == 'mv2') {
    return new Promise((resolve) => {
      browser.windows.update(windowId, updateInfo, (val) => {
        resolve(val);
      });
    });
  } else {
    return await browser.windows.update(windowId, updateInfo);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function browserWindowsRemove(windowId: number) {
  if (MANIFEST_VERSION == 'mv2') {
    return new Promise((resolve) => {
      browser.windows.remove(windowId, (val) => {
        resolve(val);
      });
    });
  } else {
    return await browser.windows.remove(windowId);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function browserStorageLocalGet(val: any) {
  if (MANIFEST_VERSION === 'mv2') {
    return new Promise((resolve) => {
      browser.storage.local.get(val, (res) => {
        resolve(res);
      });
    });
  } else {
    return await browser.storage.local.get(val);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function browserStorageLocalSet(val: any) {
  if (MANIFEST_VERSION === 'mv2') {
    return new Promise((resolve) => {
      browser.storage.local.set(val, (res) => {
        resolve(res);
      });
    });
  } else {
    return await browser.storage.local.set(val);
  }
}

export async function browserTabsGetCurrent() {
  if (MANIFEST_VERSION === 'mv2') {
    return new Promise((resolve) => {
      browser.tabs.getCurrent((val) => {
        resolve(val);
      });
    });
  } else {
    return await browser.tabs.getCurrent();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function browserTabsQuery(params: any) {
  if (MANIFEST_VERSION === 'mv2') {
    return new Promise((resolve) => {
      browser.tabs.query(params, (val) => {
        resolve(val);
      });
    });
  } else {
    return await browser.tabs.query(params);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function browserTabsCreate(params: any) {
  if (MANIFEST_VERSION === 'mv2') {
    return new Promise((resolve) => {
      browser.tabs.create(params, (val) => {
        resolve(val);
      });
    });
  } else {
    return await browser.tabs.create(params);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function browserTabsUpdate(tabId: number, params: any) {
  if (MANIFEST_VERSION === 'mv2') {
    return new Promise((resolve) => {
      browser.tabs.update(tabId, params, (val) => {
        resolve(val);
      });
    });
  } else {
    return await browser.tabs.update(tabId, params);
  }
}

export function browserWindowsOnFocusChanged(listener) {
  browser.windows.onFocusChanged.addListener(listener);
}

export function browserWindowsOnRemoved(listener) {
  browser.windows.onRemoved.addListener(listener);
}

export function browserTabsOnUpdated(listener) {
  browser.tabs.onUpdated.addListener(listener);
}

export function browserTabsOnRemoved(listener) {
  browser.tabs.onRemoved.addListener(listener);
}

export function browserRuntimeOnConnect(listener) {
  browser.runtime.onConnect.addListener(listener);
}

export function browserRuntimeOnInstalled(listener) {
  browser.runtime.onInstalled.addListener(listener);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function browserRuntimeConnect(extensionId?: string, connectInfo?: any) {
  return browser.runtime.connect(extensionId, connectInfo);
}

export default browser;
