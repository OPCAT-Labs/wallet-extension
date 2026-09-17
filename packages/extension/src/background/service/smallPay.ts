import { createPersistStore } from '@/background/utils';

import permissionService from './permission';

export interface SmallPayWhitelistItem {
  origin: string;
  logo?: string;
  approvedAt: number;
}

export interface SmallPayHistoryItem {
  origin: string;
  amount: number;
  timestamp: number;
  txid: string;
}

export interface SmallPayStore {
  enabled: boolean;
  singlePaymentLimit: number; // satoshis
  dailyLimit: number; // satoshis (24h rolling window)
  maxFeeRate: number; // sat/byteyte
  whitelist: SmallPayWhitelistItem[];
  history: SmallPayHistoryItem[];
  version?: number;
}

interface PendingPayment {
  id: number;
  origin: string;
  amount: number;
}

// Default values
const DEFAULT_SINGLE_PAYMENT_LIMIT = 10000; // 10,000 sats
const DEFAULT_DAILY_LIMIT = 5000000; // 5,000,000 sats (0.05 BTC)
const DEFAULT_MAX_FEE_RATE = 0.01; // 0.01 sat/byte
const LEGACY_DEFAULT_MAX_FEE_RATE = 1000; // sat/vB default before the 0.01 sat/byte default
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const MAX_HISTORY_ENTRIES = 1000;
const STORE_VERSION = 1;

function assertSats(value: number, what: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${what} must be a non-negative integer number of sats`);
  }
}

/**
 * One-shot schema migrations keyed on store.version, so they never re-run on a later
 * service-worker start (the fee-rate reset used to run on every init and wiped user settings).
 */
export function migrateStore(store: SmallPayStore) {
  const version = store.version ?? 0;
  if (version < 1 && store.maxFeeRate === LEGACY_DEFAULT_MAX_FEE_RATE) {
    store.maxFeeRate = DEFAULT_MAX_FEE_RATE;
  }
  store.version = STORE_VERSION;
}

class SmallPayService {
  store!: SmallPayStore;

  init = async () => {
    this.store = await createPersistStore<SmallPayStore>({
      name: 'smallPay',
      template: {
        enabled: true,
        singlePaymentLimit: DEFAULT_SINGLE_PAYMENT_LIMIT,
        dailyLimit: DEFAULT_DAILY_LIMIT,
        maxFeeRate: DEFAULT_MAX_FEE_RATE,
        whitelist: [],
        history: [],
        version: STORE_VERSION
      }
    });

    // Initialize missing fields for existing stores
    if (typeof this.store.enabled !== 'boolean') {
      this.store.enabled = false;
    }
    if (typeof this.store.singlePaymentLimit !== 'number') {
      this.store.singlePaymentLimit = DEFAULT_SINGLE_PAYMENT_LIMIT;
    }
    if (typeof this.store.dailyLimit !== 'number') {
      this.store.dailyLimit = DEFAULT_DAILY_LIMIT;
    }
    if (typeof this.store.maxFeeRate !== 'number') {
      this.store.maxFeeRate = DEFAULT_MAX_FEE_RATE;
    }
    if (!Array.isArray(this.store.whitelist)) {
      this.store.whitelist = [];
    }
    if (!Array.isArray(this.store.history)) {
      this.store.history = [];
    }
    migrateStore(this.store);
  };

  // In-flight payments: counted against the 24h limit from the moment they are validated until
  // they are recorded or abandoned, so concurrent smallPay requests cannot all pass against the
  // same pre-spend total. Not persisted: a request does not survive a service-worker restart either.
  private pending: PendingPayment[] = [];
  private nextReservationId = 1;

  // Enable/Disable SmallPay
  isEnabled = (): boolean => {
    return this.store.enabled;
  };

  setEnabled = (enabled: boolean) => {
    this.store.enabled = enabled;
  };

  // Single payment limit
  getSinglePaymentLimit = (): number => {
    return this.store.singlePaymentLimit;
  };

  setSinglePaymentLimit = (limit: number) => {
    assertSats(limit, 'single payment limit');
    if (limit > this.store.dailyLimit) {
      throw new Error('single payment limit cannot exceed the daily limit');
    }
    this.store.singlePaymentLimit = limit;
  };

  // Daily limit
  getDailyLimit = (): number => {
    return this.store.dailyLimit;
  };

  setDailyLimit = (limit: number) => {
    assertSats(limit, 'daily limit');
    if (limit < this.store.singlePaymentLimit) {
      throw new Error('daily limit cannot be lower than the single payment limit');
    }
    this.store.dailyLimit = limit;
  };

  // Max fee rate
  getMaxFeeRate = (): number => {
    return this.store.maxFeeRate;
  };

  setMaxFeeRate = (rate: number) => {
    if (!Number.isFinite(rate) || rate < 0) {
      throw new Error('max fee rate must be a non-negative number');
    }
    this.store.maxFeeRate = rate;
  };

  // Whitelist management
  getWhitelist = (): SmallPayWhitelistItem[] => {
    return this.store.whitelist;
  };

  isOriginApproved = (origin: string): boolean => {
    return this.store.whitelist.some((item) => item.origin === origin);
  };

  addToWhitelist = (origin: string, logo?: string) => {
    if (!this.isOriginApproved(origin)) {
      this.store.whitelist = [
        ...this.store.whitelist,
        {
          origin,
          logo,
          approvedAt: Date.now()
        }
      ];
    }
  };

  removeFromWhitelist = (origin: string) => {
    this.store.whitelist = this.store.whitelist.filter((item) => item.origin !== origin);
  };

  // History management
  getHistory = (): SmallPayHistoryItem[] => {
    return this.store.history;
  };

  addToHistory = (origin: string, amount: number, txid: string) => {
    const now = Date.now();
    const history = [...this.store.history, { origin, amount, timestamp: now, txid }];
    // Cap the log, but never evict an entry that still counts toward the 24h limit.
    const cutoff = now - TWENTY_FOUR_HOURS_MS;
    const firstFresh = history.findIndex((item) => item.timestamp >= cutoff);
    const old = firstFresh === -1 ? history : history.slice(0, firstFresh);
    const fresh = firstFresh === -1 ? [] : history.slice(firstFresh);
    const keepOld = Math.max(0, MAX_HISTORY_ENTRIES - fresh.length);
    this.store.history = [...(keepOld > 0 ? old.slice(-keepOld) : []), ...fresh];
  };

  // Only drops entries that no longer count toward the 24h limit, so the enforced budget cannot
  // be reset from the settings screen.
  clearHistory = () => {
    const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
    this.store.history = this.store.history.filter((item) => item.timestamp >= cutoff);
  };

  // Calculate spent amount in last 24 hours, including payments still in flight
  getSpentInLast24Hours = (): number => {
    const now = Date.now();
    const cutoff = now - TWENTY_FOUR_HOURS_MS;
    const recorded = this.store.history
      .filter((item) => item.timestamp >= cutoff)
      .reduce((sum, item) => sum + item.amount, 0);
    const inFlight = this.pending.reduce((sum, item) => sum + item.amount, 0);
    return recorded + inFlight;
  };

  /**
   * Validate a payment and, if it passes, count it against the 24h limit immediately. Call
   * settleReservation once the transaction is broadcast, or releaseReservation if it is not.
   */
  reservePayment = (
    origin: string,
    amount: number,
    feeRate: number
  ): { valid: true; reservationId: number } | { valid: false; error: string } => {
    const check = this.validatePayment(origin, amount, feeRate);
    if (!check.valid) {
      return { valid: false, error: check.error as string };
    }
    const id = this.nextReservationId++;
    this.pending.push({ id, origin, amount });
    return { valid: true, reservationId: id };
  };

  settleReservation = (reservationId: number, txid: string) => {
    const reservation = this.takePending(reservationId);
    if (reservation) {
      this.addToHistory(reservation.origin, reservation.amount, txid);
    }
  };

  releaseReservation = (reservationId: number) => {
    this.takePending(reservationId);
  };

  private takePending = (reservationId: number): PendingPayment | undefined => {
    const index = this.pending.findIndex((item) => item.id === reservationId);
    if (index === -1) return undefined;
    return this.pending.splice(index, 1)[0];
  };

  // Get remaining daily allowance
  getRemainingDailyAllowance = (): number => {
    const spent = this.getSpentInLast24Hours();
    return Math.max(0, this.store.dailyLimit - spent);
  };

  // Validate a payment request
  validatePayment = (
    origin: string,
    amount: number,
    feeRate: number
  ): { valid: boolean; error?: string } => {
    // Check if SmallPay is enabled
    if (!this.store.enabled) {
      return { valid: false, error: 'SmallPay is not enabled' };
    }

    // The granular permission is the source of truth for authorization; the whitelist only
    // carries display data and is cleared whenever the permission is revoked.
    if (!permissionService.hasSitePermission(origin, 'smallPay')) {
      return { valid: false, error: 'Origin does not hold the smallPay permission' };
    }
    if (!this.isOriginApproved(origin)) {
      return { valid: false, error: 'Origin is not approved for SmallPay' };
    }

    // Check single payment limit
    if (amount > this.store.singlePaymentLimit) {
      return {
        valid: false,
        error: `Amount ${amount} exceeds single payment limit of ${this.store.singlePaymentLimit} sats`
      };
    }

    // Check fee rate
    if (feeRate > this.store.maxFeeRate) {
      return {
        valid: false,
        error: `Fee rate ${feeRate} sat/byte exceeds maximum of ${this.store.maxFeeRate} sat/byte`
      };
    }

    // Check 24h rolling limit
    const remaining = this.getRemainingDailyAllowance();
    if (amount > remaining) {
      return {
        valid: false,
        error: `Amount ${amount} exceeds remaining daily allowance of ${remaining} sats. The 24-hour rolling limit resets gradually as older payments expire.`
      };
    }

    return { valid: true };
  };

  // Get status for a specific origin
  getStatusForOrigin = (origin: string) => {
    return {
      isEnabled: this.store.enabled,
      isApproved: this.isOriginApproved(origin) && permissionService.hasSitePermission(origin, 'smallPay'),
      singlePaymentLimit: this.store.singlePaymentLimit,
      dailyLimit: this.store.dailyLimit,
      maxFeeRate: this.store.maxFeeRate,
      remaining24h: this.getRemainingDailyAllowance(),
      spent24h: this.getSpentInLast24Hours()
    };
  };
}

export default new SmallPayService();
