import phishingService from './phishing';

type Config = {
  blacklist: string[];
  whitelist: string[];
  fuzzylist: string[];
  tolerance: number;
};

function seed({ blacklist = [], whitelist = [], fuzzylist = [], tolerance = 1 }: Partial<Config>) {
  // Bypass the storage/network-backed init(): seed the config and the lookup sets directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = phishingService as any;
  service.config = {
    version: 2,
    tolerance,
    fuzzylist,
    whitelist,
    blacklist,
    lastFetchTime: Date.now(),
    cacheExpireTime: 24 * 60 * 60 * 1000
  };
  service.temporaryWhitelist = new Set();
  service.updateSets();
}

describe('checkPhishing', () => {
  it('flags an exact blacklist hit', () => {
    seed({ blacklist: ['evil.example'] });
    expect(phishingService.checkPhishing('evil.example')).toBe(true);
    expect(phishingService.checkPhishing('www.evil.example')).toBe(true);
  });

  it('flags subdomains of a blacklisted apex domain', () => {
    seed({ blacklist: ['evil.example'] });
    // The declarative rules use `||evil.example/`, which matches subdomains; the message-based
    // check used to be an exact Set lookup, so a phisher only had to add a label.
    expect(phishingService.checkPhishing('login.evil.example')).toBe(true);
    expect(phishingService.checkPhishing('a.b.c.evil.example')).toBe(true);
  });

  it('normalises case and a trailing dot', () => {
    seed({ blacklist: ['evil.example'] });
    expect(phishingService.checkPhishing('EVIL.example.')).toBe(true);
  });

  it('does not flag an unrelated host that merely ends in the same labels', () => {
    seed({ blacklist: ['evil.example'] });
    expect(phishingService.checkPhishing('notevil.example')).toBe(false);
    expect(phishingService.checkPhishing('example')).toBe(false);
  });

  it('never matches on a bare public suffix', () => {
    seed({ blacklist: ['example'] });
    expect(phishingService.checkPhishing('good.example')).toBe(false);
  });

  it('honours the whitelist for a domain and its subdomains', () => {
    seed({ blacklist: ['evil.example'], whitelist: ['safe.example'] });
    expect(phishingService.checkPhishing('safe.example')).toBe(false);
    expect(phishingService.checkPhishing('app.safe.example')).toBe(false);
  });

  it('lets an exact blacklist hit win over a parent-domain whitelist entry', () => {
    seed({ blacklist: ['bad.hosting.example'], whitelist: ['hosting.example'] });
    expect(phishingService.checkPhishing('bad.hosting.example')).toBe(true);
    expect(phishingService.checkPhishing('good.hosting.example')).toBe(false);
  });

  it('flags look-alike domains within the configured tolerance', () => {
    seed({ blacklist: ['evil.example'], fuzzylist: ['opcatlabs.io'], tolerance: 1 });
    expect(phishingService.checkPhishing('0pcatlabs.io')).toBe(true);
    // The legitimate domain itself (distance 0) stays safe.
    expect(phishingService.checkPhishing('opcatlabs.io')).toBe(false);
    // Beyond the tolerance.
    expect(phishingService.checkPhishing('0pc4tlabs.io')).toBe(false);
  });

  it('does not fuzzy-match when tolerance is zero', () => {
    seed({ blacklist: ['evil.example'], fuzzylist: ['opcatlabs.io'], tolerance: 0 });
    expect(phishingService.checkPhishing('0pcatlabs.io')).toBe(false);
  });

  it('treats everything as safe while no list is loaded', () => {
    seed({});
    expect(phishingService.checkPhishing('evil.example')).toBe(false);
  });

  it('keeps local addresses safe', () => {
    seed({ blacklist: ['localhost', '127.0.0.1'] });
    expect(phishingService.checkPhishing('localhost')).toBe(false);
    expect(phishingService.checkPhishing('127.0.0.1')).toBe(false);
  });

  it('respects a session "proceed anyway" and tells subscribers so the rules can be dropped', () => {
    seed({ blacklist: ['evil.example'] });
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
    seed({ blacklist: ['evil.example'] });
    const onChange = jest.fn();
    phishingService.onChange(onChange);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
