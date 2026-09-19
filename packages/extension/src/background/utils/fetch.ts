import log from 'loglevel';

/**
 * Storage key for the cached scam-host list
 */
const SCAM_HOSTS_CACHE_KEY = 'phishing_list_fallback';

/**
 * Give up on a request that never settles, so a hung fetch cannot wedge the updater.
 */
const FETCH_TIMEOUT = 15000;

/**
 * Minimum cache age before attempting refresh (12 hours)
 */
const MIN_CACHE_AGE = 12 * 60 * 60 * 1000;

export interface ScamHostList {
  hosts: string[];
  lastFetchTime: number;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = FETCH_TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutMs))
  ]);
}

/**
 * Fetch the scam-host list from the wallet backend, falling back to the local cache.
 *
 * The list is first-party and per-network: it comes from the same endpoint as the rest of the
 * wallet API, so switching chains switches the list with it.
 *
 * @param forceRefresh Skip the cache and go to the backend even if the cached list is recent
 */
export const fetchScamHosts = async (forceRefresh = false): Promise<ScamHostList> => {
  if (!forceRefresh) {
    try {
      const cached = await getFromLocalCache();
      if (cached && cached.lastFetchTime && Date.now() - cached.lastFetchTime < MIN_CACHE_AGE) {
        log.debug('[Phishing] Using recent cache, age:', Math.round((Date.now() - cached.lastFetchTime) / 60000), 'minutes');
        return cached;
      }
    } catch (error) {
      log.error('[Phishing] Cache check failed:', error);
    }
  }

  try {
    // Imported on demand: a static import would pull the whole API service (and the signing SDK
    // behind it) into every module that touches phishing state.
    const { default: openapiService } = await import('@/background/service/openapi');
    const data = await withTimeout(openapiService.getScamHosts());
    const list: ScamHostList = {
      hosts: normalizeHosts(data?.hosts),
      lastFetchTime: Date.now()
    };
    await saveToLocalCache(list);
    log.debug(`[Phishing] Fetched ${list.hosts.length} scam hosts from the wallet backend`);
    return list;
  } catch (error) {
    log.error('[Phishing] Scam host fetch failed:', error);
  }

  // The backend is unreachable: keep whatever was cached, at any age, rather than dropping
  // protection entirely.
  try {
    const cached = await getFromLocalCache();
    if (cached) {
      log.warn('[Phishing] Using cached data as the backend is unreachable');
      return cached;
    }
  } catch (error) {
    log.error('[Phishing] Cache retrieval failed:', error);
  }

  throw new Error('Failed to fetch the scam host list');
};

/**
 * Hostnames are compared as lowercase strings against a Set, so normalise them once here rather
 * than at every lookup.
 */
function normalizeHosts(hosts: unknown): string[] {
  if (!Array.isArray(hosts)) return [];
  const normalized = hosts
    .filter((host): host is string => typeof host === 'string')
    .map((host) => host.trim().toLowerCase().replace(/^www\./, '').replace(/\.$/, ''))
    .filter((host) => host.length > 0);
  return Array.from(new Set(normalized));
}

/**
 * Save the scam-host list to local cache
 */
async function saveToLocalCache(data: ScamHostList): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    try {
      chrome.storage.local.set({ [SCAM_HOSTS_CACHE_KEY]: data }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(true);
      });
    } catch (error) {
      log.error('[Phishing] Failed to save to local cache:', error);
      reject(error);
    }
  });
}

/**
 * Retrieve the scam-host list from local cache
 */
async function getFromLocalCache(): Promise<ScamHostList | null> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(SCAM_HOSTS_CACHE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(result?.[SCAM_HOSTS_CACHE_KEY] ?? null);
      });
    } catch (error) {
      log.error('[Phishing] Failed to get from local cache:', error);
      reject(error);
    }
  });
}

/**
 * Clear the scam-host cache
 */
export async function clearPhishingCache(): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    try {
      chrome.storage.local.remove(SCAM_HOSTS_CACHE_KEY, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        log.debug('[Phishing] Cache cleared successfully');
        resolve(true);
      });
    } catch (error) {
      log.error('[Phishing] Failed to clear cache:', error);
      reject(error);
    }
  });
}

/**
 * Get cache statistics
 */
export async function getPhishingCacheStats(): Promise<{
  available: boolean;
  lastFetchTime: number | null;
  age: number | null;
  hosts: number | null;
}> {
  try {
    const cached = await getFromLocalCache();
    if (!cached) {
      return { available: false, lastFetchTime: null, age: null, hosts: null };
    }

    const lastFetchTime = cached.lastFetchTime || null;
    return {
      available: true,
      lastFetchTime,
      age: lastFetchTime ? Date.now() - lastFetchTime : null,
      hosts: Array.isArray(cached.hosts) ? cached.hosts.length : 0
    };
  } catch (error) {
    log.error('[Phishing] Failed to get cache stats:', error);
    return { available: false, lastFetchTime: null, age: null, hosts: null };
  }
}
