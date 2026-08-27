// jest-dom adds custom jest matchers for asserting on DOM nodes.
// Referenced by the `setupFilesAfterEnv` entry in package.json's jest config.
import '@testing-library/jest-dom';

// Minimal chrome extension API stub. background/webapi/*.ts call
// chrome.windows/tabs.on*.addListener(...) at module top level, so any test
// that transitively imports background code needs this before those modules load.
globalThis.chrome = {
  storage: {
    local: {
      get: (_keys: unknown, cb?: (items: Record<string, unknown>) => void) => {
        if (cb) return cb({});
        return Promise.resolve({});
      },
      set: (_items: unknown, cb?: () => void) => {
        if (cb) return cb();
        return Promise.resolve();
      },
      getBytesInUse: (cb: (bytes: number) => void) => cb(0)
    }
  },
  windows: {
    onFocusChanged: { addListener: () => {} },
    onRemoved: { addListener: () => {} }
  },
  tabs: {
    onUpdated: { addListener: () => {} },
    onRemoved: { addListener: () => {} }
  },
  runtime: {
    onConnect: { addListener: () => {} },
    onInstalled: { addListener: () => {} }
  }
} as unknown as typeof chrome;
