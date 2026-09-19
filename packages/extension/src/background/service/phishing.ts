import { fetchScamHosts } from '@/background/utils/fetch';
import { storage } from '@/background/webapi';

/**
 * Configuration interface for phishing detection service
 */
interface PhishingConfig {
  /**
   * Version number of the phishing configuration format
   */
  version: number;

  /**
   * Hostnames the wallet backend reports as scams
   */
  hosts: string[];

  /**
   * Timestamp of when the scam-host list was last fetched
   */
  lastFetchTime: number;

  /**
   * Duration in milliseconds before the cache is considered expired
   */
  cacheExpireTime: number;
}

const STORE_KEY = 'phishing';

/**
 * MV3 service workers are torn down after ~30s idle, so setTimeout/setInterval schedules never
 * fire. chrome.alarms survives the teardown and wakes the worker (the permission is declared in
 * the manifest).
 */
const UPDATE_ALARM_NAME = 'phishing:update-list';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
/**
 * Bumped when the stored shape changes, so a cache from an older format is discarded rather than
 * read as the current one.
 */
const VERSION = 3;
const RETRY_DELAY = 60 * 60 * 1000; // 1 hour retry delay
const MAX_RETRIES = 3;

/** Every parent suffix of a hostname, longest first, down to the registrable two-label form. */
function hostnameSuffixes(hostname: string): string[] {
  const labels = hostname.split('.');
  const suffixes: string[] = [];
  for (let i = 0; i <= labels.length - 2; i++) {
    suffixes.push(labels.slice(i).join('.'));
  }
  return suffixes.length > 0 ? suffixes : [hostname];
}

const initConfig: PhishingConfig = {
  version: VERSION,
  hosts: [],
  lastFetchTime: 0,
  cacheExpireTime: CACHE_DURATION
};

/**
 * Service for detecting phishing websites
 */
class PhishingService {
  /**
   * Current phishing configuration including the list and settings
   */
  private config: PhishingConfig = initConfig;

  /**
   * Flag to prevent concurrent update operations
   */
  private updating = false;

  /**
   * Set of hostnames temporarily whitelisted during this session
   */
  private temporaryWhitelist: Set<string> = new Set();

  /**
   * Set version of the scam-host list for O(1) lookups
   */
  private scamHostSet: Set<string> = new Set();

  /**
   * Counter for tracking update retry attempts
   */
  private retryCount = 0;

  /**
   * True once a config (cached or freshly fetched) has been loaded into the set
   */
  private loaded = false;

  /**
   * Called whenever the list or the session whitelist change, so the declarative rules the
   * controller maintains can be rebuilt. Nothing rebuilt them before: the controller built rules
   * once at startup while this service was still loading, and the 24h setInterval never fired.
   */
  private changeListeners: Array<() => void> = [];

  constructor() {
    // Registered at module load, which is what MV3 requires for the alarm to wake the worker.
    chrome.alarms?.onAlarm.addListener((alarm) => {
      if (alarm.name === UPDATE_ALARM_NAME) {
        this.updatePhishingList();
      }
    });
    this.init();
  }

  /**
   * Subscribe to list / whitelist changes. Fires immediately when a config is already loaded, so
   * the subscriber does not depend on winning a race with this service's async init.
   */
  public onChange(listener: () => void) {
    this.changeListeners.push(listener);
    if (this.loaded) {
      listener();
    }
  }

  private notifyChanged() {
    this.changeListeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('[PhishingService] change listener failed:', error);
      }
    });
  }

  /**
   * Load whatever is cached and schedule the next refresh.
   *
   * This runs at module load, before the API service has an endpoint, so it deliberately does not
   * fetch: the backend call is driven by ensureUpToDate() during background bootstrap and by the
   * alarm scheduled here. A stale or missing cache schedules the alarm at its one-minute floor.
   */
  private async init() {
    try {
      const stored = await storage.get(STORE_KEY);
      if (stored && stored.version === VERSION && Array.isArray(stored.hosts)) {
        this.config = stored;
      } else {
        this.config = { ...initConfig };
      }
      this.updateSets();
      this.notifyChanged();
      this.scheduleNextUpdate();
    } catch (error) {
      console.error('[PhishingService] Init error:', error);
      this.config = { ...initConfig };
      this.updateSets();
      this.notifyChanged();

      // Retry after initialization failure
      this.scheduleNextUpdate(RETRY_DELAY);
    }
  }

  /**
   * Schedule the next update based on cache expiration
   */
  private scheduleNextUpdate(delayMs?: number) {
    const ms = delayMs ?? Math.max(0, this.config.lastFetchTime + this.config.cacheExpireTime - Date.now());
    // chrome.alarms clamps sub-minute delays in release builds; asking for less is pointless.
    const delayInMinutes = Math.max(1, Math.ceil(ms / 60000));
    chrome.alarms?.create(UPDATE_ALARM_NAME, { delayInMinutes });
  }

  /**
   * Update the internal set for faster lookups
   */
  private updateSets() {
    this.scamHostSet = new Set(this.config.hosts);
    this.loaded = true;
  }

  /**
   * Update the scam-host list from the wallet backend
   */
  private async updatePhishingList(forceRefresh = false) {
    if (this.updating) return;

    try {
      this.updating = true;
      const { hosts } = await fetchScamHosts(forceRefresh);

      this.config = {
        hosts,
        version: VERSION,
        lastFetchTime: Date.now(),
        cacheExpireTime: CACHE_DURATION
      };

      await storage.set(STORE_KEY, this.config);
      this.updateSets();
      this.retryCount = 0;
      this.scheduleNextUpdate();
      this.notifyChanged();
    } catch (error) {
      console.error('[PhishingService] Update error:', error);

      // Retry logic after update failure
      if (this.retryCount < MAX_RETRIES) {
        this.retryCount++;
        this.scheduleNextUpdate(RETRY_DELAY / this.retryCount);
      } else {
        // After reaching max retries, continue trying at normal interval
        this.scheduleNextUpdate();
      }
    } finally {
      this.updating = false;
    }
  }

  /**
   * Startup path: load a list and refresh it only when the cached one is stale.
   *
   * Not forceUpdate(): that goes to the backend every time, and an MV3 worker restarts often
   * enough that startup would hit the API on every wake.
   */
  public async ensureUpToDate() {
    return this.updatePhishingList(false);
  }

  /**
   * Force an immediate update of the scam-host list
   */
  public async forceUpdate() {
    this.retryCount = 0;
    // Actually force it: without the flag the fetch returns the <12h cache and "force update"
    // silently did nothing.
    return this.updatePhishingList(true);
  }

  /**
   * Check if a hostname is a known phishing site
   * @param hostname The hostname to check
   * @returns True if the hostname is a phishing site
   */
  public checkPhishing(hostname: string): boolean {
    if (!hostname) return false;

    // A trailing dot is the same host to the browser but a different string to a Set.
    const cleanHostname = hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');

    try {
      // Skip checks for extension pages
      if (hostname.includes('chrome-extension://') || hostname.includes('moz-extension://')) {
        return false;
      }

      // Security check: local domains and IP addresses are always safe
      if (cleanHostname === 'localhost' || cleanHostname.startsWith('127.') || cleanHostname.startsWith('192.168.')) {
        return false;
      }

      // Security check: if the list is empty, consider all domains safe
      if (this.scamHostSet.size === 0) {
        return false;
      }

      // Check temporary whitelist (the user chose "proceed anyway" this session)
      if (this.temporaryWhitelist.has(cleanHostname)) {
        return false;
      }

      // The list names apex domains and the declarative rules match subdomains (`||domain/`), so
      // the message-based check has to walk the label suffixes too — otherwise login.evil.com is
      // reported safe while evil.com is blocked.
      return hostnameSuffixes(cleanHostname).some((suffix) => this.scamHostSet.has(suffix));
    } catch (error) {
      console.error('[PhishingService] Check error:', error);
      // Default to safe on error
      return false;
    }
  }

  /**
   * Add a hostname to the temporary whitelist
   * @param hostname The hostname to whitelist
   */
  public addToWhitelist(hostname: string) {
    if (!hostname) return;
    const cleanHostname = hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
    this.temporaryWhitelist.add(cleanHostname);
    // The declarative rules do not consult this list, so the rule for that host has to go or
    // "proceed anyway" would redirect straight back to the warning page.
    this.notifyChanged();
  }

  /**
   * Hosts the user chose to proceed to during this session.
   */
  public getTemporaryWhitelist(): string[] {
    return Array.from(this.temporaryWhitelist);
  }

  /**
   * Get the current phishing configuration (for debugging)
   */
  public getConfig() {
    return {
      ...this.config,
      temporaryWhitelistSize: this.temporaryWhitelist.size,
      scamHostSetSize: this.scamHostSet.size
    };
  }
}

export default new PhishingService();
