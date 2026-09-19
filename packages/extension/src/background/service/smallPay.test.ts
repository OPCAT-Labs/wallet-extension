import LRU from 'lru-cache';

import { ChainType } from '@/shared/constant';

import permissionService from './permission';
import smallPayService, { migrateStore, SmallPayStore } from './smallPay';

const ORIGIN = 'https://dapp.example';
const HOUR = 60 * 60 * 1000;

function freshStore(overrides: Partial<SmallPayStore> = {}): SmallPayStore {
  return {
    enabled: true,
    singlePaymentLimit: 10000,
    dailyLimit: 5000000,
    maxFeeRate: 0.01,
    whitelist: [],
    history: [],
    version: 1,
    ...overrides
  };
}

function grant(perms: ('connect' | 'smallPay')[] = ['smallPay']) {
  permissionService.connectWithPermissions(ORIGIN, 'dApp', 'icon.png', ChainType.OPCAT_MAINNET, perms);
  if (perms.includes('smallPay')) smallPayService.addToWhitelist(ORIGIN, 'icon.png');
}

beforeEach(() => {
  // Bypass the storage-backed init(): seed both services in memory (see permission.test.ts).
  permissionService.lruCache = new LRU();
  permissionService.store = { dumpCache: [] };
  smallPayService.store = freshStore();
  // drop any reservation left behind by a previous test
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (smallPayService as any).pending = [];
});

describe('authorization is the granular permission, not the whitelist', () => {
  it('auto-pays for an origin that holds smallPay', () => {
    grant();
    expect(smallPayService.reservePayment(ORIGIN, 1000, 0.005).valid).toBe(true);
  });

  it('stops auto-paying once smallPay is revoked in Connected Sites', () => {
    grant();
    permissionService.revokePermission(ORIGIN, 'smallPay');
    const res = smallPayService.reservePayment(ORIGIN, 1000, 0.005);
    expect(res.valid).toBe(false);
    expect(smallPayService.getStatusForOrigin(ORIGIN).isApproved).toBe(false);
  });

  it('stops auto-paying after a disconnect, and after reconnecting with connect only', () => {
    grant();
    permissionService.removeConnectedSite(ORIGIN);
    expect(smallPayService.reservePayment(ORIGIN, 1000, 0.005).valid).toBe(false);

    permissionService.connectWithPermissions(ORIGIN, 'dApp', 'icon.png', ChainType.OPCAT_MAINNET, ['connect']);
    expect(smallPayService.reservePayment(ORIGIN, 1000, 0.005).valid).toBe(false);
  });

  it('never authorizes from a stale whitelist entry alone', () => {
    smallPayService.addToWhitelist(ORIGIN);
    expect(smallPayService.reservePayment(ORIGIN, 1000, 0.005).valid).toBe(false);
  });
});

describe('24h limit with in-flight reservations', () => {
  beforeEach(() => {
    grant();
    smallPayService.store.dailyLimit = 1500;
    smallPayService.store.singlePaymentLimit = 1500;
  });

  it('counts a reservation immediately so a concurrent request cannot pass the same total', () => {
    const first = smallPayService.reservePayment(ORIGIN, 1000, 0.005);
    expect(first.valid).toBe(true);
    expect(smallPayService.getSpentInLast24Hours()).toBe(1000);

    const second = smallPayService.reservePayment(ORIGIN, 1000, 0.005);
    expect(second.valid).toBe(false);
    expect(second.valid === false && second.error).toMatch(/daily allowance/);
  });

  it('frees the budget when a reservation is released', () => {
    const first = smallPayService.reservePayment(ORIGIN, 1000, 0.005);
    smallPayService.releaseReservation(first.valid ? first.reservationId : -1);
    expect(smallPayService.getSpentInLast24Hours()).toBe(0);
    expect(smallPayService.reservePayment(ORIGIN, 1000, 0.005).valid).toBe(true);
  });

  it('moves a settled reservation into history with its txid', () => {
    const first = smallPayService.reservePayment(ORIGIN, 1000, 0.005);
    smallPayService.settleReservation(first.valid ? first.reservationId : -1, 'deadbeef');
    expect(smallPayService.getHistory()).toEqual([expect.objectContaining({ origin: ORIGIN, amount: 1000, txid: 'deadbeef' })]);
    expect(smallPayService.getSpentInLast24Hours()).toBe(1000);
  });

  it('ignores an unknown reservation id', () => {
    smallPayService.settleReservation(999, 'x');
    smallPayService.releaseReservation(999);
    expect(smallPayService.getHistory()).toEqual([]);
  });
});

describe('history retention', () => {
  const entry = (age: number, amount = 1) => ({ origin: ORIGIN, amount, timestamp: Date.now() - age, txid: 't' });

  it('never evicts entries that still count toward the 24h limit', () => {
    smallPayService.store.history = Array.from({ length: 1000 }, () => entry(HOUR));
    smallPayService.addToHistory(ORIGIN, 5, 'new');
    expect(smallPayService.getHistory()).toHaveLength(1001);
    expect(smallPayService.getSpentInLast24Hours()).toBe(1005);
  });

  it('caps the log by dropping the oldest entries outside the window', () => {
    smallPayService.store.history = [
      ...Array.from({ length: 1000 }, (_, i) => ({ ...entry(48 * HOUR + i), txid: `old${i}` })),
      ...Array.from({ length: 5 }, (_, i) => ({ ...entry(HOUR), txid: `fresh${i}` }))
    ];
    smallPayService.addToHistory(ORIGIN, 5, 'new');
    const history = smallPayService.getHistory();
    expect(history).toHaveLength(1000);
    expect(history.slice(-6).map((h) => h.txid)).toEqual(['fresh0', 'fresh1', 'fresh2', 'fresh3', 'fresh4', 'new']);
    expect(history[0].txid).toBe('old6');
  });

  it('clearHistory keeps the entries that still count toward the limit', () => {
    smallPayService.store.history = [entry(48 * HOUR, 100), entry(HOUR, 7)];
    smallPayService.clearHistory();
    expect(smallPayService.getHistory()).toHaveLength(1);
    expect(smallPayService.getSpentInLast24Hours()).toBe(7);
  });
});

describe('limit setters', () => {
  it.each([[-1], [1.5], [NaN], [Number.MAX_SAFE_INTEGER + 2]])('rejects single limit %p', (v) => {
    expect(() => smallPayService.setSinglePaymentLimit(v)).toThrow();
  });

  it('keeps single <= daily', () => {
    expect(() => smallPayService.setSinglePaymentLimit(5000001)).toThrow('cannot exceed the daily limit');
    expect(() => smallPayService.setDailyLimit(9999)).toThrow('cannot be lower than the single payment limit');
    smallPayService.setDailyLimit(20000);
    smallPayService.setSinglePaymentLimit(20000);
    expect(smallPayService.getSinglePaymentLimit()).toBe(20000);
  });

  it('rejects a non-finite or negative fee rate', () => {
    expect(() => smallPayService.setMaxFeeRate(NaN)).toThrow();
    expect(() => smallPayService.setMaxFeeRate(-0.1)).toThrow();
    smallPayService.setMaxFeeRate(2);
    expect(smallPayService.getMaxFeeRate()).toBe(2);
  });
});

describe('migrateStore', () => {
  it('resets the legacy 1000 sat/vB default once and stamps the version', () => {
    const store = freshStore({ maxFeeRate: 1000, version: undefined });
    migrateStore(store);
    expect(store.maxFeeRate).toBe(0.01);
    expect(store.version).toBe(1);
  });

  it('leaves a user-configured rate alone', () => {
    const store = freshStore({ maxFeeRate: 2, version: undefined });
    migrateStore(store);
    expect(store.maxFeeRate).toBe(2);
  });

  it('does not re-run on a store that is already at the current version', () => {
    const store = freshStore({ maxFeeRate: 1000, version: 1 });
    migrateStore(store);
    expect(store.maxFeeRate).toBe(1000);
  });
});
