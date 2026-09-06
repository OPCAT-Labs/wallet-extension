// OPCAT layer has no 546-sat dust rule; relay-policy minimum is 1 sat.
// Using 546 (Bitcoin Core policy) would silently sweep small change amounts to fees.
export const UTXO_DUST = 1;
