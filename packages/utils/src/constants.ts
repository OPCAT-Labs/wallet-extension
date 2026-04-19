export const BITCOIN_UTXO_DUST = 546;
export const OPCAT_UTXO_DUST = 1;

// Default to Bitcoin policy. OPCAT callers must opt into the 1-sat policy explicitly.
export const UTXO_DUST = BITCOIN_UTXO_DUST;

export function getUtxoDustThreshold(isOpcat = false) {
  return isOpcat ? OPCAT_UTXO_DUST : BITCOIN_UTXO_DUST;
}
