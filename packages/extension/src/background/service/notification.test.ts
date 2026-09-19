const mockOpenNotification = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/background/webapi', () => ({
  winMgr: {
    event: { on: jest.fn() },
    openNotification: (...args: unknown[]) => mockOpenNotification(...args),
    remove: (...args: unknown[]) => mockRemove(...args)
  }
}));

import notificationService from './notification';

describe('notificationService.requestApproval', () => {
  beforeEach(() => {
    notificationService.approval = null;
    notificationService.notifiWindowId = 0;
    mockOpenNotification.mockReset().mockResolvedValue(1);
    mockRemove.mockReset().mockResolvedValue(undefined);
  });

  it('opens a window for the first request and settles it on resolve', async () => {
    const pending = notificationService.requestApproval({ approvalComponent: 'SignPsbt' });
    expect(mockOpenNotification).toHaveBeenCalledTimes(1);

    notificationService.resolveApproval({ psbtHex: 'aa' });
    await expect(pending).resolves.toEqual({ psbtHex: 'aa' });
    expect(notificationService.approval).toBeNull();
  });

  it('refuses a second request instead of replacing the pending one', async () => {
    const first = notificationService.requestApproval({ approvalComponent: 'SignPsbt' });

    await expect(notificationService.requestApproval({ approvalComponent: 'Connect' })).rejects.toThrow(
      /current approval/
    );
    // The first request is untouched: same window, promise still live and still resolvable.
    expect(mockOpenNotification).toHaveBeenCalledTimes(1);
    notificationService.resolveApproval('first');
    await expect(first).resolves.toBe('first');
  });

  it('accepts a new request once the pending one is resolved', async () => {
    const first = notificationService.requestApproval({ approvalComponent: 'SignPsbt' });
    notificationService.resolveApproval('first');
    await first;

    const second = notificationService.requestApproval({ approvalComponent: 'Connect' });
    notificationService.resolveApproval('second');
    await expect(second).resolves.toBe('second');
    expect(mockOpenNotification).toHaveBeenCalledTimes(2);
  });

  it('accepts a new request once the pending one is rejected', async () => {
    const first = notificationService.requestApproval({ approvalComponent: 'SignPsbt' });
    const settled = expect(first).rejects.toThrow();
    await notificationService.rejectApproval();
    await settled;

    const second = notificationService.requestApproval({ approvalComponent: 'Connect' });
    notificationService.resolveApproval('second');
    await expect(second).resolves.toBe('second');
  });

  it('does not wedge every later request when the window cannot be opened', async () => {
    mockOpenNotification.mockRejectedValueOnce(new Error('no window'));

    await expect(notificationService.requestApproval({ approvalComponent: 'SignPsbt' })).rejects.toThrow();

    mockOpenNotification.mockResolvedValue(2);
    const next = notificationService.requestApproval({ approvalComponent: 'Connect' });
    notificationService.resolveApproval('ok');
    await expect(next).resolves.toBe('ok');
  });
});
