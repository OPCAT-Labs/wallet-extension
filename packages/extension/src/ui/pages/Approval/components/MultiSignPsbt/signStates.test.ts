import { approvedIndexesOf, SignState } from './signStates';

const { PENDING, SUCCESS, FAILED } = SignState;

describe('approvedIndexesOf', () => {
  it('drops exactly the entries the user opened and rejected', () => {
    expect(approvedIndexesOf([SUCCESS, FAILED, SUCCESS], 3)).toEqual([0, 2]);
  });

  it('keeps entries the user never opened — that is what the quick-multi-sign disclaimer covers', () => {
    expect(approvedIndexesOf([SUCCESS, PENDING, PENDING], 3)).toEqual([0, 1, 2]);
  });

  it('treats a not-yet-initialised state array as nothing rejected', () => {
    expect(approvedIndexesOf([], 2)).toEqual([0, 1]);
  });

  it('returns an empty list when every entry was rejected, so the approval is rejected outright', () => {
    expect(approvedIndexesOf([FAILED, FAILED], 2)).toEqual([]);
  });

  it('ignores states past the item count', () => {
    expect(approvedIndexesOf([SUCCESS, FAILED, SUCCESS], 2)).toEqual([0]);
  });
});
