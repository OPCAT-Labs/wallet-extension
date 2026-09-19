const mockWindowsGetAll = jest.fn();
const mockWindowsGetCurrent = jest.fn();
const mockWindowsCreate = jest.fn();
const mockWindowsUpdate = jest.fn();

jest.mock('./browser', () => ({
  browserWindowsCreate: (...args: unknown[]) => mockWindowsCreate(...args),
  browserWindowsGetAll: (...args: unknown[]) => mockWindowsGetAll(...args),
  browserWindowsGetCurrent: (...args: unknown[]) => mockWindowsGetCurrent(...args),
  browserWindowsOnFocusChanged: () => undefined,
  browserWindowsOnRemoved: () => undefined,
  browserWindowsRemove: jest.fn(),
  browserWindowsUpdate: (...args: unknown[]) => mockWindowsUpdate(...args)
}));

import winMgr from './window';

const NORMAL_WINDOW = { id: 1, type: 'normal', state: 'normal', top: 0, left: 0, width: 1280, height: 960 };
// A notification of the wallet's own: 400x600, already offset down the screen.
const NOTIFICATION_WINDOW = { id: 2, type: 'popup', state: 'normal', top: 560, left: 880, width: 400, height: 600 };

beforeEach(() => {
  mockWindowsGetAll.mockReset().mockResolvedValue([NORMAL_WINDOW, NOTIFICATION_WINDOW]);
  mockWindowsGetCurrent.mockReset().mockResolvedValue(NORMAL_WINDOW);
  mockWindowsCreate.mockReset().mockImplementation(async (props) => ({ id: 3, left: props.left }));
  mockWindowsUpdate.mockReset().mockResolvedValue(undefined);
});

describe('openNotification placement', () => {
  it('anchors to the browser window, not to a notification that happens to be focused', async () => {
    // getCurrent returns the wallet's own popup, which is what Chrome does once it has focus:
    // windows.getCurrent ignores the deprecated windowTypes filter.
    mockWindowsGetCurrent.mockResolvedValue(NOTIFICATION_WINDOW);

    await winMgr.openNotification({});

    const props = mockWindowsCreate.mock.calls[0][0];
    // Anchored to the 1280-wide browser window: flush to its right edge, one header below its top.
    expect(props.top).toBe(80);
    expect(props.left).toBe(1280 - props.width);
  });

  it('does not walk down the screen when opened repeatedly', async () => {
    const tops: number[] = [];
    for (let i = 0; i < 5; i++) {
      mockWindowsCreate.mockClear();
      // Each round the previously opened notification is the focused window.
      mockWindowsGetCurrent.mockResolvedValue({ ...NOTIFICATION_WINDOW, top: 80 * (i + 1) });
      await winMgr.openNotification({});
      tops.push(mockWindowsCreate.mock.calls[0][0].top);
    }
    expect(tops).toEqual([80, 80, 80, 80, 80]);
  });

  it('retries without bounds when the browser refuses the computed position', async () => {
    mockWindowsCreate
      .mockRejectedValueOnce(new Error('Invalid value for bounds. Bounds must be at least 50% within visible screen space.'))
      .mockResolvedValueOnce({ id: 9 });

    const id = await winMgr.openNotification({});

    expect(id).toBe(9);
    expect(mockWindowsCreate).toHaveBeenCalledTimes(2);
    const retry = mockWindowsCreate.mock.calls[1][0];
    expect(retry.top).toBeUndefined();
    expect(retry.left).toBeUndefined();
    expect(retry.url).toContain('notification.html');
  });

  it('falls back to the focused window when the window list is unavailable', async () => {
    mockWindowsGetAll.mockRejectedValue(new Error('nope'));

    await winMgr.openNotification({});

    expect(mockWindowsCreate).toHaveBeenCalledTimes(1);
    expect(mockWindowsCreate.mock.calls[0][0].top).toBe(80);
  });
});
