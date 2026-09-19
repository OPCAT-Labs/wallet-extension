import { EventEmitter } from 'events';
import log from 'loglevel';

import { IS_WINDOWS } from '@/shared/constant';

import {
  browserWindowsCreate,
  browserWindowsGetAll,
  browserWindowsGetCurrent,
  browserWindowsOnFocusChanged,
  browserWindowsOnRemoved,
  browserWindowsRemove,
  browserWindowsUpdate
} from './browser';

const event = new EventEmitter();

browserWindowsOnFocusChanged((winId) => {
  event.emit('windowFocusChange', winId);
});

browserWindowsOnRemoved((winId) => {
  event.emit('windowRemoved', winId);
});

const BROWSER_HEADER = 80;
const WINDOW_SIZE = {
  width: 400 + (IS_WINDOWS ? 14 : 0), // idk why windows cut the width.
  height: 600
};

/**
 * Anchor for a new notification window: a real browser window, never another notification.
 *
 * windows.getCurrent's `windowTypes` filter is deprecated and ignored, so when a notification is
 * focused it used to anchor to that popup — each approval then opened BROWSER_HEADER lower than
 * the one before it and eventually fell outside the screen, at which point windows.create fails
 * with "Bounds must be at least 50% within visible screen space" and no approval can be shown.
 */
const getAnchorWindow = async () => {
  try {
    const windows = await browserWindowsGetAll({});
    const normal = windows.find((win) => win.type === 'normal' && typeof win.left === 'number');
    if (normal) return normal;
  } catch {
    // fall through to the focused window
  }
  return await browserWindowsGetCurrent();
};

const create = async ({ url, ...rest }): Promise<number | undefined> => {
  const anchor = await getAnchorWindow();

  const top = (anchor.top ?? 0) + BROWSER_HEADER;
  const left = (anchor.left ?? 0) + (anchor.width ?? WINDOW_SIZE.width) - WINDOW_SIZE.width;

  const currentWindow = await browserWindowsGetCurrent();
  let win;
  if (currentWindow.state === 'fullscreen') {
    // browser.windows.create not pass state to chrome
    win = await browserWindowsCreate({
      focused: true,
      url,
      type: 'popup',
      ...rest,
      width: undefined,
      height: undefined,
      left: undefined,
      top: undefined,
      state: 'fullscreen'
    });
  } else {
    try {
      win = await browserWindowsCreate({
        focused: true,
        url,
        type: 'popup',
        top,
        left,
        ...WINDOW_SIZE,
        ...rest
      });
    } catch (e) {
      // Chrome refuses bounds that fall outside the visible screen. Never let placement stop an
      // approval from being shown: ask for the window again and let the browser position it.
      log.warn('[window] falling back to default placement:', e);
      win = await browserWindowsCreate({
        focused: true,
        url,
        type: 'popup',
        ...WINDOW_SIZE,
        ...rest
      });
      return win.id;
    }
  }

  // shim firefox
  if (win.left !== left) {
    await browserWindowsUpdate(win.id!, { left, top }).catch(() => undefined);
  }

  return win.id;
};

const remove = async (winId) => {
  return browserWindowsRemove(winId);
};

const openNotification = ({ route = '', ...rest } = {}): Promise<number | undefined> => {
  const url = `notification.html${route && `#${route}`}`;

  return create({ url, ...rest });
};

export default {
  openNotification,
  event,
  remove
};
