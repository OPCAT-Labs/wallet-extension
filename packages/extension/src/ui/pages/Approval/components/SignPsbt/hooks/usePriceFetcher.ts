import { useEffect, useState } from 'react';

export const usePriceFetcher = (txInfo, wallet, tools) => {
  const [cat20PriceMap, setCat20PriceMap] = useState();

  useEffect(() => {
    if (!txInfo?.decodedPsbt?.inputInfos) return;

    const cat20Map = {};

    // collect asset information
    txInfo.decodedPsbt.inputInfos.forEach((v) => {
      if (v.cat20) {
        v.cat20.forEach((w) => {
          cat20Map[w.tokenId] = true;
        });
      }
    });

    // get asset price
    if (Object.keys(cat20Map).length > 0) {
      wallet
        .getCAT20sPrice(Object.keys(cat20Map))
        .then(setCat20PriceMap)
        .catch((e) => tools.toastError(e.message));
    }
  }, [txInfo, wallet, tools]);

  return { cat20PriceMap };
};
