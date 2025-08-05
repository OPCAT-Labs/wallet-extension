import compose from 'koa-compose';

export default class PromiseFlow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _tasks: ((args: any) => void)[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _context: any = {};
  requestedApproval = false;

  use(fn): PromiseFlow {
    if (typeof fn !== 'function') {
      throw new Error('promise need function to handle');
    }
    this._tasks.push(fn);

    return this;
  }

  callback() {
    return compose(this._tasks);
  }
}
