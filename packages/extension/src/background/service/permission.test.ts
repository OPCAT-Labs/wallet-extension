import LRU from 'lru-cache';

import { ChainType } from '@/shared/constant';

import permissionService from './permission';

describe('permissionService.connectWithPermissions', () => {
  const ORIGIN = 'https://clawchats.app';

  beforeEach(() => {
    // Bypass the storage-backed init() entirely: seed the in-memory cache
    // directly so each test starts from a clean, isolated LRU instance
    // instead of sharing state through the module-level storage cacheMap.
    permissionService.lruCache = new LRU();
    permissionService.store = { dumpCache: [] };
  });

  it('keeps a previously granted permission that is not in the new request', () => {
    permissionService.connectWithPermissions(ORIGIN, 'ClawChat', 'icon.png', ChainType.OPCAT_MAINNET, [
      'smallPay'
    ]);

    permissionService.connectWithPermissions(ORIGIN, 'ClawChat', 'icon.png', ChainType.OPCAT_MAINNET, [
      'ecdh',
      'getPKHByPath'
    ]);

    expect(permissionService.getSitePermissions(ORIGIN)).toEqual({
      connect: true,
      smallPay: true,
      ecdh: true,
      getPKHByPath: true
    });
  });

  it('does not resurrect a permission the user explicitly revoked', () => {
    permissionService.connectWithPermissions(ORIGIN, 'ClawChat', 'icon.png', ChainType.OPCAT_MAINNET, [
      'ecdh',
      'getPKHByPath',
      'smallPay'
    ]);

    permissionService.revokePermission(ORIGIN, 'smallPay');

    permissionService.connectWithPermissions(ORIGIN, 'ClawChat', 'icon.png', ChainType.OPCAT_MAINNET, ['ecdh']);

    expect(permissionService.getSitePermissions(ORIGIN)).toEqual({
      connect: true,
      ecdh: true,
      getPKHByPath: true
    });
  });

  it('does not resurrect permissions of a disconnected site on reconnect', () => {
    permissionService.connectWithPermissions(ORIGIN, 'ClawChat', 'icon.png', ChainType.OPCAT_MAINNET, [
      'ecdh',
      'smallPay'
    ]);

    // User disconnects the site via the Connected Sites screen. This only
    // flips isConnected to false; site.permissions stays intact internally.
    permissionService.removeConnectedSite(ORIGIN);

    // Site reconnects and the user approves the Connect popup with nothing
    // checked, so only 'connect' is requested.
    permissionService.connectWithPermissions(ORIGIN, 'ClawChat', 'icon.png', ChainType.OPCAT_MAINNET, ['connect']);

    expect(permissionService.getSitePermissions(ORIGIN)).toEqual({
      connect: true
    });
  });

  it('grants exactly what was requested for a brand-new site', () => {
    permissionService.connectWithPermissions(
      'https://new-site.example',
      'New Site',
      'icon.png',
      ChainType.OPCAT_MAINNET,
      ['ecdh']
    );

    expect(permissionService.getSitePermissions('https://new-site.example')).toEqual({
      connect: true,
      ecdh: true
    });
  });

  it('makes an explicit uncheck durable when revokePermission is applied after a merge-write (mirrors requestPermissions in controller.ts)', () => {
    // dApp requests ['ecdh', 'smallPay'], user grants only ['connect', 'ecdh']
    // in the approval popup (smallPay left unchecked).
    const requested: Array<'ecdh' | 'smallPay'> = ['ecdh', 'smallPay'];
    const grantedPerms = ['connect', 'ecdh'];

    permissionService.connectWithPermissions(ORIGIN, 'ClawChat', 'icon.png', ChainType.OPCAT_MAINNET, grantedPerms);

    // Mirrors the fix in controller.ts requestPermissions: revoke anything
    // requested but not actually granted (excluding 'connect').
    for (const p of requested) {
      if (p !== 'connect' && !grantedPerms.includes(p)) {
        permissionService.revokePermission(ORIGIN, p);
      }
    }

    expect(permissionService.getSitePermissions(ORIGIN)).toEqual({
      connect: true,
      ecdh: true
    });
  });
});
