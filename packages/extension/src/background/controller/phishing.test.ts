import { PhishingMessageType } from '@/background/constant/PhishingMessageType';

import phishingService from '../service/phishing';

type MessageListener = (
  message: Record<string, unknown>,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => boolean;

let listener: MessageListener;
let updateDynamicRules: jest.Mock;

beforeEach(() => {
  jest.resetModules();
  updateDynamicRules = jest.fn().mockResolvedValue(undefined);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).chrome = {
    ...globalThis.chrome,
    runtime: {
      ...globalThis.chrome?.runtime,
      id: 'test-extension-id',
      getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
      onMessage: {
        addListener: (fn: MessageListener) => {
          listener = fn;
        }
      }
    },
    declarativeNetRequest: {
      updateDynamicRules,
      getDynamicRules: jest.fn().mockResolvedValue([]),
      RuleActionType: { REDIRECT: 'redirect' },
      ResourceType: { MAIN_FRAME: 'main_frame' }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = phishingService as any;
  service.config = {
    version: 2,
    tolerance: 1,
    fuzzylist: [],
    whitelist: [],
    blacklist: ['evil.example'],
    lastFetchTime: Date.now(),
    cacheExpireTime: 24 * 60 * 60 * 1000
  };
  service.temporaryWhitelist = new Set();
  service.changeListeners = [];
  service.updateSets();
});

describe('SKIP_PHISHING_PROTECTION', () => {
  it('acknowledges only after the redirect rule for that host is gone', async () => {
    // The warning page navigates as soon as this responds. Answering before the rule update lands
    // sends the user straight back to the warning page.
    const controller = (await import('./phishing')).default;
    controller.init();

    let ruleUpdateResolve: () => void = () => undefined;
    updateDynamicRules.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          ruleUpdateResolve = resolve;
        })
    );

    const sendResponse = jest.fn();
    const handled = listener(
      { type: PhishingMessageType.SKIP_PHISHING_PROTECTION, hostname: 'evil.example' },
      {} as chrome.runtime.MessageSender,
      sendResponse
    );

    // Keeping the message channel open is what allows an async response at all.
    expect(handled).toBe(true);
    await Promise.resolve();
    expect(sendResponse).not.toHaveBeenCalled();

    ruleUpdateResolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  it('still acknowledges when the rule update fails, so the user is not stuck', async () => {
    const controller = (await import('./phishing')).default;
    controller.init();

    updateDynamicRules.mockRejectedValue(new Error('no rules today'));

    const sendResponse = jest.fn();
    listener(
      { type: PhishingMessageType.SKIP_PHISHING_PROTECTION, hostname: 'evil.example' },
      {} as chrome.runtime.MessageSender,
      sendResponse
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });
});
