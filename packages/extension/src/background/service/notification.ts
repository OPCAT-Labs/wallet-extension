import { ethErrors } from 'eth-rpc-errors';
import { EthereumProviderError } from 'eth-rpc-errors/dist/classes';
import Events from 'events';

import { winMgr } from '@/background/webapi';
import { IS_CHROME, IS_LINUX } from '@/shared/constant';

interface Approval {
  data: {
    state: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any;
    origin?: string;
    approvalComponent: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestDefer?: Promise<any>;
    approvalType: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve(params?: any): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject(err: EthereumProviderError<any>): void;
}

// something need user approval in window
// should only open one window, unfocus will close the current notification
class NotificationService extends Events {
  approval: Approval | null = null;
  notifiWindowId = 0;
  isLocked = false;

  constructor() {
    super();

    winMgr.event.on('windowRemoved', (winId: number) => {
      if (winId === this.notifiWindowId) {
        this.notifiWindowId = 0;
        this.rejectApproval();
      }
    });

    winMgr.event.on('windowFocusChange', (winId: number) => {
      if (this.notifiWindowId && winId !== this.notifiWindowId) {
        if (IS_CHROME && winId === chrome.windows.WINDOW_ID_NONE && IS_LINUX) {
          // Wired issue: When notification popuped, will focus to -1 first then focus on notification
          return;
        }
        // this.rejectApproval();
      }
    });
  }

  getApproval = () => this.approval?.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveApproval = (data?: any, forceReject = false) => {
    if (forceReject) {
      this.approval?.reject(new EthereumProviderError(4001, 'User Cancel'));
    } else {
      this.approval?.resolve(data);
    }
    this.approval = null;
    this.emit('resolve', data);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rejectApproval = async (err?: string, stay = false, isInternal = false) => {
    if (!this.approval) return;
    if (isInternal) {
      this.approval?.reject(ethErrors.rpc.internal(err));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.approval?.reject(ethErrors.provider.userRejectedRequest<any>(err));
    }

    await this.clear(stay);
    this.emit('reject', err);
  };

  // currently it only support one approval at the same time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestApproval = async (data: any, winProps?: any): Promise<any> => {
    // if (preferenceService.getPopupOpen()) {
    //   this.approval = null;
    //   throw ethErrors.provider.userRejectedRequest('please request after user close current popup');
    // }

    // We will just override the existing open approval with the new one coming in
    return new Promise((resolve, reject) => {
      this.approval = {
        data,
        resolve,
        reject
      };

      this.openNotification(winProps);
    });
  };

  clear = async (stay = false) => {
    this.approval = null;
    if (this.notifiWindowId && !stay) {
      await winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = 0;
    }
  };

  unLock = () => {
    this.isLocked = false;
  };

  lock = () => {
    this.isLocked = true;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openNotification = (winProps: any) => {
    // if (this.isLocked) return;
    // this.lock();
    if (this.notifiWindowId) {
      winMgr.remove(this.notifiWindowId);
      this.notifiWindowId = 0;
    }
    winMgr.openNotification(winProps).then((winId) => {
      this.notifiWindowId = winId!;
    });
  };
}

export default new NotificationService();
