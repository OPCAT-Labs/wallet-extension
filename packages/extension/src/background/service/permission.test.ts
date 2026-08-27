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
});
