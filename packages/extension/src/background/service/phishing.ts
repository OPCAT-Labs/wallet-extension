import { fetchPhishingList } from '@/background/utils/fetch';
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
   * Tolerance level for fuzzy matching (higher = more strict)
   */
  tolerance: number;

  /**
   * List of patterns for fuzzy matching against hostnames
   */
  fuzzylist: string[];

  /**
   * List of hostnames that should never be considered phishing sites
   */
  whitelist: string[];

  /**
   * List of hostnames that are confirmed phishing sites
   */
  blacklist: string[];

  /**
   * Timestamp of when the phishing list was last fetched
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
const VERSION = 2;
const RETRY_DELAY = 60 * 60 * 1000; // 1 hour retry delay
const MAX_RETRIES = 3;

/**
 * Levenshtein distance, abandoned as soon as it exceeds `max` (the caller only cares whether the
 * hostname is within `tolerance` of a fuzzylist entry).
 */
function levenshteinWithin(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}

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
  tolerance: 1,
  fuzzylist: [],
  whitelist: [],
  blacklist: [],
  lastFetchTime: 0,
  cacheExpireTime: CACHE_DURATION
};

/**
 * Service for detecting phishing websites
 */
class PhishingService {
  /**
   * Current phishing configuration including lists and settings
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
   * Set version of blacklist for O(1) lookups
   */
  private blacklistSet: Set<string> = new Set();

  /**
   * Set version of whitelist for O(1) lookups
   */
  private whitelistSet: Set<string> = new Set();

  /**
   * Counter for tracking update retry attempts
   */
  private retryCount = 0;

  /**
   * True once a config (cached or freshly fetched) has been loaded into the sets
   */
  private loaded = false;

  /**
   * Called whenever the lists or the session whitelist change, so the declarative rules the
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
   * Initialize the phishing service
   */
  private async init() {
    try {
      const stored = await storage.get(STORE_KEY);
      if (stored) {
        if (
          stored.version !== VERSION ||
          !stored.lastFetchTime ||
          Date.now() - stored.lastFetchTime > stored.cacheExpireTime
        ) {
          await this.updatePhishingList();
        } else {
          // Ensure default whitelist is always present
          const mergedWhitelist = Array.from(new Set([...(stored.whitelist || []), ...initConfig.whitelist]));

          this.config = {
            ...stored,
            whitelist: mergedWhitelist
          };

          this.updateSets();
          this.notifyChanged();
        }
      } else {
        // No stored config, use initial config
        this.config = { ...initConfig };
        this.updateSets();
        await this.updatePhishingList();
      }

      this.scheduleNextUpdate();

    } catch (error) {
      console.error('[PhishingService] Init error:', error);
      this.config = { ...initConfig };
      this.updateSets();

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
   * Update internal sets for faster lookups
   */
  private updateSets() {
    this.blacklistSet = new Set(this.config.blacklist);
    this.whitelistSet = new Set(this.config.whitelist);
    this.loaded = true;
  }

  /**
   * Update the phishing list from remote source
   */
  private async updatePhishingList(forceRefresh = false) {
    if (this.updating) return;

    try {
      this.updating = true;
      const newConfig = await fetchPhishingList(forceRefresh);

      // Ensure domains in default whitelist are not in the blacklist
      const defaultWhitelist = new Set(initConfig.whitelist);

      // Filter blacklist, remove whitelisted domains and their subdomains
      let filteredBlacklist: string[] = [];
      if (Array.isArray(newConfig.blacklist)) {
        filteredBlacklist = newConfig.blacklist.filter((domain) => {
          // Remove domains in whitelist
          if (defaultWhitelist.has(domain)) {
            return false;
          }

          // Remove subdomains of whitelisted domains
          const domainParts = domain.split('.');
          if (domainParts.length > 2) {
            const mainDomain = domainParts.slice(domainParts.length - 2).join('.');
            if (defaultWhitelist.has(mainDomain)) {
              return false;
            }
          }

          // Keep other domains
          return true;
        });
      }

      // Merge remote whitelist and default whitelist
      const mergedWhitelist = Array.from(new Set([...(newConfig.whitelist || []), ...initConfig.whitelist]));

      this.config = {
        ...newConfig,
        blacklist: filteredBlacklist,
        whitelist: mergedWhitelist,
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
   * Not forceUpdate(): that re-downloads every remote source, and an MV3 worker restarts often
   * enough that startup would pull several MB again each time.
   */
  public async ensureUpToDate() {
    return this.updatePhishingList(false);
  }

  /**
   * Force an immediate update of the phishing list
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

      // Security check: if blacklist is empty, consider all domains safe
      if (this.blacklistSet.size === 0) {
        return false;
      }

      // Check temporary whitelist (the user chose "proceed anyway" this session)
      if (this.temporaryWhitelist.has(cleanHostname)) {
        return false;
      }

      // An exact blacklist hit wins over a parent-domain whitelist entry.
      if (this.blacklistSet.has(cleanHostname)) {
        return true;
      }

      const suffixes = hostnameSuffixes(cleanHostname);

      if (suffixes.some((suffix) => this.whitelistSet.has(suffix))) {
        return false;
      }

      // The lists name apex domains and the declarative rules match subdomains (`||domain/`), so
      // the message-based check has to walk the label suffixes too — otherwise login.evil.com is
      // reported safe while evil.com is blocked.
      if (suffixes.some((suffix) => this.blacklistSet.has(suffix))) {
        return true;
      }

      // Look-alike domains: the fuzzylist and its tolerance were fetched and stored but never
      // consulted, so 0pcatlabs.io was never flagged for a fuzzylist entry of opcatlabs.io.
      // Distance 0 means the hostname is the legitimate domain itself.
      const tolerance = this.config.tolerance || 0;
      if (tolerance > 0 && Array.isArray(this.config.fuzzylist)) {
        for (const entry of this.config.fuzzylist) {
          const distance = levenshteinWithin(cleanHostname, entry, tolerance);
          if (distance > 0 && distance <= tolerance) {
            return true;
          }
        }
      }

      return false;
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
      blacklistSetSize: this.blacklistSet.size,
      whitelistSetSize: this.whitelistSet.size
    };
  }
}

export default new PhishingService();
