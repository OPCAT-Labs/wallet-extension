export const BITCOIN_UTXO_DUST = 546;
export const OPCAT_UTXO_DUST = 1;

export enum ChainType {
  BITCOIN = 'bitcoin',
  OPCAT = 'opcat'
}

// Default to Bitcoin policy. OPCAT callers must select the OPCAT chain policy explicitly.
export const UTXO_DUST = BITCOIN_UTXO_DUST;

export function getChainTypeFromOpcatFlag(isOpcat = false) {
  return isOpcat ? ChainType.OPCAT : ChainType.BITCOIN;
}

export function resolveChainType({
  chainType,
  isOpcat
}: {
  chainType?: ChainType;
  /** @deprecated Use chainType instead. */
  isOpcat?: boolean;
} = {}) {
  return chainType || getChainTypeFromOpcatFlag(isOpcat);
}

export function getUtxoDustThreshold(chainType: ChainType = ChainType.BITCOIN) {
  return chainType === ChainType.OPCAT ? OPCAT_UTXO_DUST : BITCOIN_UTXO_DUST;
}
