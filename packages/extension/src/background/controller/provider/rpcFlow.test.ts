jest.mock('@/background/service', () => ({
  keyringService: {
    memStore: { getState: () => ({ isUnlocked: true }) }
  },
  notificationService: {
    requestApproval: jest.fn().mockResolvedValue({}),
    unLock: jest.fn()
  },
  permissionService: {
    hasPermission: jest.fn(),
    touchConnectedSite: jest.fn(),
    updateConnectSite: jest.fn(),
    connectWithPermissions: jest.fn()
  }
}));

jest.mock('./controller', () => ({
  __esModule: true,
  default: {
    getPermissions: jest.fn().mockResolvedValue({ connect: true }),
    getAccounts: jest.fn().mockResolvedValue([])
  }
}));

import { notificationService, permissionService } from '@/background/service';

import rpcFlow from './rpcFlow';

const mockRequestApproval = notificationService.requestApproval as jest.Mock;
const mockHasPermission = permissionService.hasPermission as jest.Mock;

describe('rpcFlow getPermissions exemption', () => {
  beforeEach(() => {
    mockHasPermission.mockReset();
    mockRequestApproval.mockClear();
    mockRequestApproval.mockResolvedValue({});
  });

  it('does not pop a Connect approval when the site is not yet marked connected', async () => {
    mockHasPermission.mockReturnValue(false);

    await rpcFlow({
      data: { method: 'getPermissions', params: {} },
      session: { origin: 'https://clawchats.app', name: 'ClawChat', icon: 'icon.png' }
    });

    expect(mockRequestApproval).not.toHaveBeenCalled();
  });

  it('still leaves getAccounts short-circuiting to [] without a Connect popup (unrelated, unchanged behavior)', async () => {
    mockHasPermission.mockReturnValue(false);

    await rpcFlow({
      data: { method: 'getAccounts', params: {} },
      session: { origin: 'https://clawchats.app', name: 'ClawChat', icon: 'icon.png' }
    });

    expect(mockRequestApproval).not.toHaveBeenCalled();
  });
});
