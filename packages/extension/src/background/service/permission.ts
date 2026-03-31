import { max } from 'lodash';
import LRU from 'lru-cache';

import { createPersistStore } from '@/background/utils';
import { CHAINS_ENUM, INTERNAL_REQUEST_ORIGIN } from '@/shared/constant';

export type PermissionType = 'connect' | 'ecdh' | 'getPKHByPath' | 'smallPay';

export interface PermissionGrant {
  granted: boolean;
  grantedAt: number;
}

export interface ConnectedSite {
  origin: string;
  icon: string;
  name: string;
  chain: CHAINS_ENUM;
  e?: number;
  isSigned: boolean;
  isTop: boolean;
  order?: number;
  isConnected: boolean;
  // Granular permissions (optional for backward compatibility)
  permissions?: Partial<Record<PermissionType, PermissionGrant>>;
}

export type PermissionStore = {
  dumpCache: ReadonlyArray<LRU.Entry<string, ConnectedSite>>;
};

class PermissionService {
  store: PermissionStore = {
    dumpCache: []
  };
  lruCache: LRU<string, ConnectedSite> | undefined;

  init = async () => {
    const storage = await createPersistStore<PermissionStore>({
      name: 'permission'
    });
    this.store = storage || this.store;

    this.lruCache = new LRU();
    const cache: ReadonlyArray<LRU.Entry<string, ConnectedSite>> = (this.store.dumpCache || []).map((item) => ({
      k: item.k,
      v: item.v,
      e: 0
    }));
    this.lruCache.load(cache);
  };

  sync = () => {
    if (!this.lruCache) return;
    this.store.dumpCache = this.lruCache.dump();
  };

  getWithoutUpdate = (key: string) => {
    if (!this.lruCache) return;

    return this.lruCache.peek(key);
  };

  getSite = (origin: string) => {
    return this.lruCache?.get(origin);
  };

  setSite = (site: ConnectedSite) => {
    if (!this.lruCache) return;
    this.lruCache.set(site.origin, site);
    this.sync();
  };

  addConnectedSite = (origin: string, name: string, icon: string, defaultChain: CHAINS_ENUM, isSigned = false) => {
    if (!this.lruCache) return;

    this.lruCache.set(origin, {
      origin,
      name,
      icon,
      chain: defaultChain,
      isSigned,
      isTop: false,
      isConnected: true
    });
    this.sync();
  };

  touchConnectedSite = (origin) => {
    if (!this.lruCache) return;
    if (origin === INTERNAL_REQUEST_ORIGIN) return;
    this.lruCache.get(origin);
    this.sync();
  };

  updateConnectSite = (origin: string, value: Partial<ConnectedSite>, partialUpdate?: boolean) => {
    if (!this.lruCache || !this.lruCache.has(origin)) return;
    if (origin === INTERNAL_REQUEST_ORIGIN) return;

    if (partialUpdate) {
      const _value = this.lruCache.get(origin);
      this.lruCache.set(origin, { ..._value, ...value } as ConnectedSite);
    } else {
      this.lruCache.set(origin, value as ConnectedSite);
    }

    this.sync();
  };

  hasPermission = (origin) => {
    if (!this.lruCache) return;
    if (origin === INTERNAL_REQUEST_ORIGIN) return true;

    const site = this.lruCache.get(origin);
    return site && site.isConnected;
  };

  setRecentConnectedSites = (sites: ConnectedSite[]) => {
    this.lruCache?.load(
      sites
        .map((item) => ({
          e: 0,
          k: item.origin,
          v: item
        }))
        .concat(
          (this.lruCache?.values() || [])
            .filter((item) => !item.isConnected)
            .map((item) => ({
              e: 0,
              k: item.origin,
              v: item
            }))
        )
    );
    this.sync();
  };

  getRecentConnectedSites = () => {
    const sites = (this.lruCache?.values() || []).filter((item) => item.isConnected);
    const pinnedSites = sites.filter((item) => item?.isTop).sort((a, b) => (a.order || 0) - (b.order || 0));
    const recentSites = sites.filter((item) => !item.isTop);
    return [...pinnedSites, ...recentSites];
  };

  getConnectedSites = () => {
    return (this.lruCache?.values() || []).filter((item) => item.isConnected);
  };

  getConnectedSite = (key: string) => {
    const site = this.lruCache?.get(key);
    if (site && site.isConnected) {
      return site;
    }
  };

  topConnectedSite = (origin: string, order?: number) => {
    const site = this.getConnectedSite(origin);
    if (!site || !this.lruCache) return;
    order = order ?? (max(this.getRecentConnectedSites().map((item) => item.order)) || 0) + 1;
    this.updateConnectSite(origin, {
      ...site,
      order,
      isTop: true
    });
  };

  unpinConnectedSite = (origin: string) => {
    const site = this.getConnectedSite(origin);
    if (!site || !this.lruCache) return;
    this.updateConnectSite(origin, {
      ...site,
      isTop: false
    });
  };

  removeConnectedSite = (origin: string) => {
    if (!this.lruCache) return;
    const site = this.getConnectedSite(origin);
    if (!site) {
      return;
    }
    this.setSite({
      ...site,
      isConnected: false
    });
    this.sync();
  };

  getSitesByDefaultChain = (chain: CHAINS_ENUM) => {
    if (!this.lruCache) return [];
    return this.lruCache.values().filter((item) => item.chain === chain);
  };

  isInternalOrigin = (origin: string) => {
    return origin === INTERNAL_REQUEST_ORIGIN;
  };

  // ========== Granular Permission Methods ==========

  /**
   * Grant specific permissions to a connected site.
   * Ensures 'connect' is always included.
   */
  grantPermissions = (origin: string, permissionTypes: PermissionType[]) => {
    const site = this.lruCache?.get(origin);
    if (!site) return;

    const now = Date.now();
    const permissions = site.permissions || {};

    for (const perm of permissionTypes) {
      permissions[perm] = { granted: true, grantedAt: now };
    }

    // connect is always required
    if (!permissions.connect?.granted) {
      permissions.connect = { granted: true, grantedAt: now };
    }

    this.updateConnectSite(origin, { permissions }, true);
  };

  /**
   * Revoke a specific permission from a site.
   * Revoking 'connect' revokes all permissions.
   */
  revokePermission = (origin: string, permissionType: PermissionType) => {
    const site = this.lruCache?.get(origin);
    if (!site || !site.permissions) return;

    if (permissionType === 'connect') {
      // Revoking connect = disconnect entirely
      this.removeConnectedSite(origin);
      return;
    }

    const permissions = { ...site.permissions };
    if (permissions[permissionType]) {
      permissions[permissionType] = { granted: false, grantedAt: permissions[permissionType]!.grantedAt };
    }
    this.updateConnectSite(origin, { permissions }, true);
  };

  /**
   * Check if a site has a specific permission.
   */
  hasSitePermission = (origin: string, permissionType: PermissionType): boolean => {
    if (origin === INTERNAL_REQUEST_ORIGIN) return true;

    const site = this.lruCache?.get(origin);
    if (!site || !site.isConnected) return false;

    // 'connect' is implicit if isConnected is true
    if (permissionType === 'connect') return true;

    return site.permissions?.[permissionType]?.granted === true;
  };

  /**
   * Get all granted permissions for a site.
   */
  getSitePermissions = (origin: string): Partial<Record<PermissionType, boolean>> => {
    const site = this.lruCache?.get(origin);
    if (!site || !site.isConnected) return {};

    const result: Partial<Record<PermissionType, boolean>> = { connect: true };
    if (site.permissions) {
      for (const [key, val] of Object.entries(site.permissions)) {
        if (val?.granted) {
          result[key as PermissionType] = true;
        }
      }
    }
    return result;
  };

  /**
   * Connect a site with specific permissions (for requestPermissions flow).
   */
  connectWithPermissions = (
    origin: string,
    name: string,
    icon: string,
    defaultChain: CHAINS_ENUM,
    permissionTypes: PermissionType[]
  ) => {
    if (!this.lruCache) return;

    const now = Date.now();
    const permissions: Partial<Record<PermissionType, PermissionGrant>> = {};
    for (const perm of permissionTypes) {
      permissions[perm] = { granted: true, grantedAt: now };
    }
    // Always grant connect
    if (!permissions.connect) {
      permissions.connect = { granted: true, grantedAt: now };
    }

    const existingSite = this.lruCache.get(origin);
    this.lruCache.set(origin, {
      origin,
      name,
      icon,
      chain: defaultChain,
      isSigned: existingSite?.isSigned || false,
      isTop: existingSite?.isTop || false,
      order: existingSite?.order,
      isConnected: true,
      permissions
    });
    this.sync();
  };
}

export default new PermissionService();
