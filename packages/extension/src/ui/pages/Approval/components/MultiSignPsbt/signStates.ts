/**
 * Per-item state of a multi-sign approval screen, shared by MultiSignPsbt and MultiSignMessage.
 */
export enum SignState {
  PENDING,
  SUCCESS,
  FAILED
}

/**
 * Indexes the background may sign: everything the user did not explicitly reject.
 *
 * Items left PENDING are still included — that is what the quick-multi-sign disclaimer asks the
 * user to accept — but an item the user opened and rejected must never produce a signature.
 */
export function approvedIndexesOf(signStates: SignState[], itemCount: number): number[] {
  const approved: number[] = [];
  for (let index = 0; index < itemCount; index++) {
    if (signStates[index] !== SignState.FAILED) {
      approved.push(index);
    }
  }
  return approved;
}
