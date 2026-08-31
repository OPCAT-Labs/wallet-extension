/**
 * Pure client-side search / sort / trait-filter logic for the CAT-721 screens.
 *
 * Mirrors the catmint profile "Owned" tab approach: an address owns far fewer NFTs than a whole
 * collection, so facets are built and filters applied entirely in the client — no new API surface.
 * Trait semantics match the marketplace: OR within a trait, AND across traits.
 *
 * Everything here is pure (no React / no fetch) so it can be unit-tested in isolation.
 */
import { CAT721Balance } from '@/shared/types';

import { NftTrait } from './nftTraits';

export type LocalIdSort = 'asc' | 'desc';

/**
 * Numeric-aware localId comparison. CAT-721 localIds are decimal strings, but fall back to plain
 * string compare for any non-numeric id so sorting never throws or reshuffles unpredictably.
 */
export function compareLocalIds(a: string, b: string): number {
  const na = /^\d+$/.test(a) ? BigInt(a) : null;
  const nb = /^\d+$/.test(b) ? BigInt(b) : null;
  if (na !== null && nb !== null) return na < nb ? -1 : na > nb ? 1 : 0;
  if (na !== null) return -1; // numeric ids sort before non-numeric
  if (nb !== null) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortLocalIds(ids: string[], order: LocalIdSort): string[] {
  const sorted = [...ids].sort(compareLocalIds);
  return order === 'desc' ? sorted.reverse() : sorted;
}

/**
 * Full search over an owned set: matches the localId OR any trait value (both substring,
 * case-insensitive). A leading "#" pins the query to ids only, so "#1" doesn't drag in every item
 * whose trait values contain "1". Items whose traits haven't loaded yet still match by id.
 */
export function searchLocalIds(
  ids: string[],
  traitsById: ReadonlyMap<string, NftTrait[]>,
  query: string
): string[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return ids;
  const idOnly = raw.startsWith('#');
  const q = idOnly ? raw.slice(1) : raw;
  if (!q) return ids;
  return ids.filter(id => {
    if (id.toLowerCase().includes(q)) return true;
    if (idOnly) return false;
    const traits = traitsById.get(id);
    return !!traits && traits.some(t => t.value.toLowerCase().includes(q));
  });
}

export interface TraitFacetValue {
  value: string;
  count: number;
}

export interface TraitFacet {
  trait: string;
  values: TraitFacetValue[];
}

/** Selected trait values: trait name → chosen values (empty = trait unused). */
export type TraitSelection = Record<string, string[]>;

// High-cardinality exclusion (same heuristic as catmint's client facets): a trait whose
// distinct-value count approaches its carrier count is a per-item hash/serial, useless as a
// filter. Only kicks in once enough items carry the trait so tiny inventories keep their traits.
const HIGH_CARDINALITY_RATIO = 0.6;
const MIN_CARRIERS_FOR_EXCLUSION = 12;

/**
 * Build filterable facets from per-item traits. `traitsById` may cover only a subset of ids
 * (fetches still in flight or failed) — missing items simply don't contribute counts.
 */
export function buildTraitFacets(traitsById: ReadonlyMap<string, NftTrait[]>): TraitFacet[] {
  // trait → value → count, plus trait → carrier count
  const counts = new Map<string, Map<string, number>>();
  const carriers = new Map<string, number>();
  for (const traits of traitsById.values()) {
    const seenTraits = new Set<string>();
    for (const { trait, value } of traits) {
      let values = counts.get(trait);
      if (!values) {
        values = new Map();
        counts.set(trait, values);
      }
      values.set(value, (values.get(value) ?? 0) + 1);
      if (!seenTraits.has(trait)) {
        seenTraits.add(trait);
        carriers.set(trait, (carriers.get(trait) ?? 0) + 1);
      }
    }
  }

  const facets: TraitFacet[] = [];
  for (const [trait, values] of counts) {
    const carrierCount = carriers.get(trait) ?? 0;
    if (carrierCount >= MIN_CARRIERS_FOR_EXCLUSION && values.size / carrierCount > HIGH_CARDINALITY_RATIO) {
      continue;
    }
    facets.push({
      trait,
      values: [...values.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    });
  }
  return facets.sort((a, b) => a.trait.localeCompare(b.trait));
}

/**
 * Apply a trait selection: OR within a trait, AND across traits. Items whose traits haven't
 * loaded (missing from the map) are excluded once any trait filter is active — they can't be
 * proven to match.
 */
export function filterIdsByTraits(
  ids: string[],
  traitsById: ReadonlyMap<string, NftTrait[]>,
  selection: TraitSelection
): string[] {
  const active = Object.entries(selection).filter(([, v]) => v.length > 0);
  if (active.length === 0) return ids;
  return ids.filter(id => {
    const traits = traitsById.get(id);
    if (!traits) return false;
    return active.every(([trait, wanted]) => traits.some(t => t.trait === trait && wanted.includes(t.value)));
  });
}

/** Toggle one trait value in a selection, dropping traits that empty out. */
export function toggleTraitValue(selection: TraitSelection, trait: string, value: string): TraitSelection {
  const cur = selection[trait] ?? [];
  const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
  const out: TraitSelection = { ...selection, [trait]: next };
  if (next.length === 0) delete out[trait];
  return out;
}

export function countSelectedTraits(selection: TraitSelection): number {
  return Object.values(selection).reduce((n, v) => n + v.length, 0);
}

/** Case-insensitive collection search over name and collectionId. */
export function filterCollectionsByQuery(collections: CAT721Balance[], query: string): CAT721Balance[] {
  const q = query.trim().toLowerCase();
  if (!q) return collections;
  return collections.filter(
    c => c.name.toLowerCase().includes(q) || c.collectionId.toLowerCase().includes(q)
  );
}
