import { fetchScamHosts } from '@/background/utils/fetch';

import phishingService from './phishing';

jest.mock('@/background/utils/fetch', () => ({
  fetchScamHosts: jest.fn()
}));

jest.mock('@/background/webapi', () => ({
  storage: { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) }
}));

const mockFetchScamHosts = fetchScamHosts as jest.MockedFunction<typeof fetchScamHosts>;

function seed(hosts: string[] = []) {
  // Bypass the storage/network-backed init(): seed the config and the lookup set directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = phishingService as any;
  service.config = {
    version: 3,
    hosts,
    lastFetchTime: Date.now(),
    cacheExpireTime: 24 * 60 * 60 * 1000
  };
  service.temporaryWhitelist = new Set();
  service.updateSets();
}

describe('checkPhishing', () => {
  it('flags an exact hit', () => {
    seed(['evil.example']);
    expect(phishingService.checkPhishing('evil.example')).toBe(true);
    expect(phishingService.checkPhishing('www.evil.example')).toBe(true);
  });

  it('flags subdomains of a listed apex domain', () => {
    seed(['evil.example']);
    // The declarative rules use `||evil.example/`, which matches subdomains; the message-based
    // check used to be an exact Set lookup, so a phisher only had to add a label.
    expect(phishingService.checkPhishing('login.evil.example')).toBe(true);
    expect(phishingService.checkPhishing('a.b.c.evil.example')).toBe(true);
  });

  it('normalises case and a trailing dot', () => {
    seed(['evil.example']);
    expect(phishingService.checkPhishing('EVIL.example.')).toBe(true);
  });

  it('does not flag an unrelated host that merely ends in the same labels', () => {
    seed(['evil.example']);
    expect(phishingService.checkPhishing('notevil.example')).toBe(false);
    expect(phishingService.checkPhishing('example')).toBe(false);
  });

  it('never matches on a bare public suffix', () => {
    seed(['example']);
    expect(phishingService.checkPhishing('good.example')).toBe(false);
  });

  it('treats everything as safe while no list is loaded', () => {
    seed([]);
    expect(phishingService.checkPhishing('evil.example')).toBe(false);
  });

  it('keeps local addresses safe', () => {
    seed(['localhost', '127.0.0.1']);
    expect(phishingService.checkPhishing('localhost')).toBe(false);
    expect(phishingService.checkPhishing('127.0.0.1')).toBe(false);
  });

  it('respects a session "proceed anyway" and tells subscribers so the rules can be dropped', () => {
    seed(['evil.example']);
    const onChange = jest.fn();
    phishingService.onChange(onChange);
    onChange.mockClear();

    phishingService.addToWhitelist('www.evil.example');

    expect(onChange).toHaveBeenCalled();
    expect(phishingService.checkPhishing('evil.example')).toBe(false);
    expect(phishingService.getTemporaryWhitelist()).toEqual(['evil.example']);
  });
});

describe('onChange', () => {
  it('fires immediately when a config is already loaded, so a late subscriber is not stranded', () => {
    seed(['evil.example']);
    const onChange = jest.fn();
    phishingService.onChange(onChange);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('list refresh', () => {
  beforeEach(() => {
    seed([]);
    mockFetchScamHosts.mockReset().mockResolvedValue({
      hosts: ['evil.example'],
      lastFetchTime: Date.now()
    });
  });

  it('forces a backend fetch only when asked to', async () => {
    await phishingService.forceUpdate();
    expect(mockFetchScamHosts).toHaveBeenCalledWith(true);
    expect(phishingService.checkPhishing('evil.example')).toBe(true);
  });

  it('leaves the cache in charge on the startup path', async () => {
    // restoreAppState runs on every MV3 worker start; forcing here hit the API each time,
    // ignoring both the cache and the daily alarm.
    await phishingService.ensureUpToDate();
    expect(mockFetchScamHosts).toHaveBeenCalledWith(false);
  });

  it('keeps the previous list when the backend is unreachable', async () => {
    seed(['evil.example']);
    mockFetchScamHosts.mockRejectedValue(new Error('offline'));

    await phishingService.forceUpdate();

    expect(phishingService.checkPhishing('evil.example')).toBe(true);
  });
});
