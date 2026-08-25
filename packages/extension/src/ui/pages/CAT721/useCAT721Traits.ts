/**
 * Batch-fetches per-NFT trait metadata for an owned CAT-721 set so the collection screen can
 * build client-side trait facets (catmint-style: an address owns few items, so filtering in the
 * client is simpler and instant).
 *
 * Entering a collection warms the FULL owned set — every item must be covered so trait facets and
 * trait-value search see the whole inventory, however large. The tracker only exposes traits
 * per-NFT, so this fans out one request per localId with a small concurrency cap. Results are
 * memoized module-wide — traits are immutable on-chain metadata — so revisits never refetch.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchNftTraits, NftTrait } from './nftTraits';

const CONCURRENCY = 6;
/** Push accumulated results into state every N completions. */
const FLUSH_EVERY = 8;

// Traits are immutable per (baseUrl, collection, localId); rejected fetches (network errors) are
// NOT cached so a later mount can retry them.
const traitCache = new Map<string, NftTrait[]>();

function cacheKey(contentBaseUrl: string, collectionId: string, localId: string) {
  return `${contentBaseUrl}:${collectionId}:${localId}`;
}

export interface CAT721TraitsState {
  /** localId → traits, for every item fetched so far. */
  traitsById: Map<string, NftTrait[]>;
  /** True while any fetches for the current id set are in flight. */
  loading: boolean;
}

export function useCAT721Traits(
  contentBaseUrl: string,
  collectionId: string | undefined,
  localIds: string[]
): CAT721TraitsState {
  const [traitsById, setTraitsById] = useState<Map<string, NftTrait[]>>(() => new Map());
  const [loading, setLoading] = useState(false);
  // Key the effect on the id set's content, not array identity.
  const idsKey = useMemo(() => localIds.join(','), [localIds]);
  const idsRef = useRef(localIds);
  idsRef.current = localIds;

  useEffect(() => {
    if (!collectionId || !contentBaseUrl || idsRef.current.length === 0) {
      setTraitsById(new Map());
      setLoading(false);
      return;
    }
    const ids = idsRef.current;
    let cancelled = false;

    const done = new Map<string, NftTrait[]>();
    const pending: string[] = [];
    for (const id of ids) {
      const hit = traitCache.get(cacheKey(contentBaseUrl, collectionId, id));
      if (hit) done.set(id, hit);
      else pending.push(id);
    }
    setTraitsById(new Map(done));
    if (pending.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let next = 0;
    let sinceFlush = 0;
    const flush = () => {
      if (!cancelled) setTraitsById(new Map(done));
      sinceFlush = 0;
    };
    const worker = async () => {
      while (!cancelled) {
        const i = next++;
        if (i >= pending.length) return;
        const id = pending[i];
        try {
          const traits = await fetchNftTraits(contentBaseUrl, collectionId, id);
          traitCache.set(cacheKey(contentBaseUrl, collectionId, id), traits);
          done.set(id, traits);
          if (++sinceFlush >= FLUSH_EVERY) flush();
        } catch {
          // Leave the id out — facets simply won't count it. Not cached, so a later visit retries.
        }
      }
    };
    void Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker)).finally(() => {
      if (!cancelled) {
        flush();
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [contentBaseUrl, collectionId, idsKey]);

  return { traitsById, loading };
}
