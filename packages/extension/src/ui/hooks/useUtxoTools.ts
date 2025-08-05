import { TypeChain } from '@/shared/constant';

export const useUtxoTools = (chain: TypeChain) => {
  // const chainType = useChainType();

  // todo: change the url
  const openUtxoTools = () => {
    window.open(`${chain.unisatUrl}/utils/utxo`);
  };

  return {
    openUtxoTools
  };
};
