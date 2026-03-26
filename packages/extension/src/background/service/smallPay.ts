import { createPersistStore } from '@/background/utils';

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
}

// Default values
const DEFAULT_SINGLE_PAYMENT_LIMIT = 10000; // 10,000 sats
const DEFAULT_DAILY_LIMIT = 5000000; // 5,000,000 sats (0.05 BTC)
const DEFAULT_MAX_FEE_RATE = 0.01; // 0.01 sat/byte
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

class SmallPayService {
  store!: SmallPayStore;

  init = async () => {
    this.store = await createPersistStore<SmallPayStore>({
      name: 'smallPay',
      template: {
        enabled: false,
        singlePaymentLimit: DEFAULT_SINGLE_PAYMENT_LIMIT,
        dailyLimit: DEFAULT_DAILY_LIMIT,
        maxFeeRate: DEFAULT_MAX_FEE_RATE,
        whitelist: [],
        history: []
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
    // Migrate old default fee rate (1000 sat/vB) to new default (0.01 sat/byte)
    if (this.store.maxFeeRate >= 1) {
      this.store.maxFeeRate = DEFAULT_MAX_FEE_RATE;
    }
    if (!Array.isArray(this.store.whitelist)) {
      this.store.whitelist = [];
    }
    if (!Array.isArray(this.store.history)) {
      this.store.history = [];
    }
  };

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
    this.store.singlePaymentLimit = limit;
  };

  // Daily limit
  getDailyLimit = (): number => {
    return this.store.dailyLimit;
  };

  setDailyLimit = (limit: number) => {
    this.store.dailyLimit = limit;
  };

  // Max fee rate
  getMaxFeeRate = (): number => {
    return this.store.maxFeeRate;
  };

  setMaxFeeRate = (rate: number) => {
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
    this.store.history = [
      ...this.store.history,
      {
        origin,
        amount,
        timestamp: Date.now(),
        txid
      }
    ];
    // Clean up old history (keep last 1000 entries)
    if (this.store.history.length > 1000) {
      this.store.history = this.store.history.slice(-1000);
    }
  };

  clearHistory = () => {
    this.store.history = [];
  };

  // Calculate spent amount in last 24 hours
  getSpentInLast24Hours = (): number => {
    const now = Date.now();
    const cutoff = now - TWENTY_FOUR_HOURS_MS;
    return this.store.history
      .filter((item) => item.timestamp >= cutoff)
      .reduce((sum, item) => sum + item.amount, 0);
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

    // Check if origin is approved
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
      isApproved: this.isOriginApproved(origin),
      singlePaymentLimit: this.store.singlePaymentLimit,
      dailyLimit: this.store.dailyLimit,
      maxFeeRate: this.store.maxFeeRate,
      remaining24h: this.getRemainingDailyAllowance(),
      spent24h: this.getSpentInLast24Hours()
    };
  };
}

export default new SmallPayService();
