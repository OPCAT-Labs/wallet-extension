const mockGetScamHosts = jest.fn();

jest.mock('@/background/service/openapi', () => ({
  __esModule: true,
  default: { getScamHosts: (...args: unknown[]) => mockGetScamHosts(...args) }
}));

import { fetchScamHosts } from './fetch';

let store: Record<string, unknown>;

beforeEach(() => {
  store = {};
  mockGetScamHosts.mockReset();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).chrome = {
    runtime: {},
    storage: {
      local: {
        get: (key: string, cb: (result: Record<string, unknown>) => void) =>
          cb(key in store ? { [key]: store[key] } : {}),
        set: (items: Record<string, unknown>, cb: () => void) => {
          Object.assign(store, items);
          cb();
        },
        remove: (key: string, cb: () => void) => {
          delete store[key];
          cb();
        }
      }
    }
  };
});

describe('fetchScamHosts', () => {
  it('normalises what the backend returns', async () => {
    mockGetScamHosts.mockResolvedValue({
      hosts: ['  EVIL.example  ', 'www.evil2.example', 'evil3.example.', 'evil.example', '', 42, null],
      updatedAt: '2026-09-19T09:01:17.000Z'
    });

    const { hosts } = await fetchScamHosts(true);

    // Lowercased, trimmed, www- and trailing-dot-stripped, deduped, non-strings dropped.
    expect(hosts).toEqual(['evil.example', 'evil2.example', 'evil3.example']);
  });

  it('serves a recent cache without calling the backend', async () => {
    mockGetScamHosts.mockResolvedValue({ hosts: ['evil.example'], updatedAt: '' });
    await fetchScamHosts(true);
    mockGetScamHosts.mockClear();

    const { hosts } = await fetchScamHosts();

    expect(mockGetScamHosts).not.toHaveBeenCalled();
    expect(hosts).toEqual(['evil.example']);
  });

  it('falls back to the cache at any age when the backend fails', async () => {
    mockGetScamHosts.mockResolvedValue({ hosts: ['evil.example'], updatedAt: '' });
    await fetchScamHosts(true);

    // A mainnet deployment without the route answers 404, which httpGet turns into a throw.
    mockGetScamHosts.mockRejectedValue(new Error('Network error with status: 404'));

    const { hosts } = await fetchScamHosts(true);

    // Dropping the list here would silently turn phishing protection off.
    expect(hosts).toEqual(['evil.example']);
  });

  it('throws when the backend fails and nothing is cached', async () => {
    mockGetScamHosts.mockRejectedValue(new Error('Network error with status: 404'));

    await expect(fetchScamHosts(true)).rejects.toThrow('Failed to fetch the scam host list');
  });

  it('treats a missing hosts field as an empty list rather than failing', async () => {
    mockGetScamHosts.mockResolvedValue({ updatedAt: '2026-09-19T09:01:17.000Z' });

    const { hosts } = await fetchScamHosts(true);

    expect(hosts).toEqual([]);
  });
});
