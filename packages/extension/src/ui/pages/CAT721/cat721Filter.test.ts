import { CAT721Balance } from '@/shared/types';

import {
  buildTraitFacets,
  compareLocalIds,
  countSelectedTraits,
  filterCollectionsByQuery,
  filterIdsByTraits,
  searchLocalIds,
  sortLocalIds,
  toggleTraitValue,
  TraitSelection
} from './cat721Filter';
import { NftTrait } from './nftTraits';

function traitsMap(entries: Record<string, NftTrait[]>): Map<string, NftTrait[]> {
  return new Map(Object.entries(entries));
}

describe('compareLocalIds / sortLocalIds', () => {
  it('orders numeric ids numerically, not lexicographically', () => {
    expect(sortLocalIds(['10', '2', '1'], 'asc')).toEqual(['1', '2', '10']);
  });

  it('supports descending order', () => {
    expect(sortLocalIds(['10', '2', '1'], 'desc')).toEqual(['10', '2', '1']);
  });

  it('handles ids beyond Number.MAX_SAFE_INTEGER', () => {
    const big = '9007199254740993'; // 2^53 + 1
    const bigger = '9007199254740994';
    expect(compareLocalIds(big, bigger)).toBe(-1);
    expect(compareLocalIds(bigger, big)).toBe(1);
    expect(compareLocalIds(big, big)).toBe(0);
  });

  it('sorts numeric ids before non-numeric, non-numeric as strings', () => {
    expect(sortLocalIds(['b', '2', 'a', '10'], 'asc')).toEqual(['2', '10', 'a', 'b']);
  });

  it('does not mutate the input array', () => {
    const ids = ['3', '1', '2'];
    sortLocalIds(ids, 'asc');
    expect(ids).toEqual(['3', '1', '2']);
  });
});

describe('searchLocalIds', () => {
  const traitsById = traitsMap({
    '1': [{ trait: 'Background', value: 'Deep Red' }],
    '12': [{ trait: 'Background', value: 'Blue' }],
    '20': [{ trait: 'Eyes', value: 'red laser' }]
  });
  const ids = ['1', '12', '20', '31']; // "31" has no loaded traits

  it('returns everything for an empty query', () => {
    expect(searchLocalIds(ids, traitsById, '')).toEqual(ids);
    expect(searchLocalIds(ids, traitsById, '  #  ')).toEqual(ids);
  });

  it('matches localId OR trait value, case-insensitively', () => {
    expect(searchLocalIds(ids, traitsById, 'red')).toEqual(['1', '20']);
    expect(searchLocalIds(ids, traitsById, 'BLUE')).toEqual(['12']);
    expect(searchLocalIds(ids, traitsById, '2')).toEqual(['12', '20']);
  });

  it('pins to ids only with a leading #', () => {
    // "red" appears in trait values but "#red" must match nothing;
    // "#1" must not match item 20 despite its "red laser" trait.
    expect(searchLocalIds(ids, traitsById, '#red')).toEqual([]);
    expect(searchLocalIds(ids, traitsById, '#1')).toEqual(['1', '12', '31']);
  });

  it('still matches by id for items whose traits have not loaded', () => {
    expect(searchLocalIds(ids, traitsById, '31')).toEqual(['31']);
  });
});

describe('buildTraitFacets', () => {
  it('counts values per trait, sorted by count desc then value', () => {
    const facets = buildTraitFacets(
      traitsMap({
        '1': [{ trait: 'Background', value: 'Red' }],
        '2': [{ trait: 'Background', value: 'Blue' }],
        '3': [{ trait: 'Background', value: 'Blue' }]
      })
    );
    expect(facets).toEqual([
      {
        trait: 'Background',
        values: [
          { value: 'Blue', count: 2 },
          { value: 'Red', count: 1 }
        ]
      }
    ]);
  });

  it('sorts traits alphabetically', () => {
    const facets = buildTraitFacets(
      traitsMap({
        '1': [
          { trait: 'Eyes', value: 'Laser' },
          { trait: 'Background', value: 'Red' }
        ]
      })
    );
    expect(facets.map(f => f.trait)).toEqual(['Background', 'Eyes']);
  });

  it('excludes high-cardinality traits once enough items carry them', () => {
    // 12 carriers, every value distinct → ratio 1.0 > 0.6 → excluded.
    const entries: Record<string, NftTrait[]> = {};
    for (let i = 0; i < 12; i++) {
      entries[String(i)] = [
        { trait: 'Serial', value: `hash-${i}` },
        { trait: 'Tier', value: i % 2 === 0 ? 'Gold' : 'Silver' }
      ];
    }
    const facets = buildTraitFacets(traitsMap(entries));
    expect(facets.map(f => f.trait)).toEqual(['Tier']);
  });

  it('keeps all-distinct traits on small inventories (below carrier minimum)', () => {
    const entries: Record<string, NftTrait[]> = {};
    for (let i = 0; i < 11; i++) {
      entries[String(i)] = [{ trait: 'Serial', value: `hash-${i}` }];
    }
    const facets = buildTraitFacets(traitsMap(entries));
    expect(facets.map(f => f.trait)).toEqual(['Serial']);
  });

  it('returns empty for an empty map', () => {
    expect(buildTraitFacets(new Map())).toEqual([]);
  });
});

describe('filterIdsByTraits', () => {
  const traitsById = traitsMap({
    '1': [
      { trait: 'Background', value: 'Red' },
      { trait: 'Eyes', value: 'Laser' }
    ],
    '2': [
      { trait: 'Background', value: 'Blue' },
      { trait: 'Eyes', value: 'Laser' }
    ],
    '3': [{ trait: 'Background', value: 'Blue' }]
  });
  const ids = ['1', '2', '3', '4']; // "4" has no fetched traits

  it('returns all ids when the selection is empty', () => {
    expect(filterIdsByTraits(ids, traitsById, {})).toEqual(ids);
    expect(filterIdsByTraits(ids, traitsById, { Background: [] })).toEqual(ids);
  });

  it('ORs values within one trait', () => {
    expect(filterIdsByTraits(ids, traitsById, { Background: ['Red', 'Blue'] })).toEqual(['1', '2', '3']);
  });

  it('ANDs across traits', () => {
    expect(
      filterIdsByTraits(ids, traitsById, {
        Background: ['Blue'],
        Eyes: ['Laser']
      })
    ).toEqual(['2']);
  });

  it('excludes items whose traits have not loaded when a filter is active', () => {
    expect(filterIdsByTraits(ids, traitsById, { Eyes: ['Laser'] })).toEqual(['1', '2']);
  });
});

describe('toggleTraitValue / countSelectedTraits', () => {
  it('adds, removes, and drops emptied traits without mutating the input', () => {
    const empty: TraitSelection = {};
    const one = toggleTraitValue(empty, 'Background', 'Red');
    expect(one).toEqual({ Background: ['Red'] });
    expect(empty).toEqual({});

    const two = toggleTraitValue(one, 'Background', 'Blue');
    expect(two).toEqual({ Background: ['Red', 'Blue'] });
    expect(countSelectedTraits(two)).toBe(2);

    const back = toggleTraitValue(two, 'Background', 'Red');
    expect(back).toEqual({ Background: ['Blue'] });

    const cleared = toggleTraitValue(back, 'Background', 'Blue');
    expect(cleared).toEqual({});
    expect(countSelectedTraits(cleared)).toBe(0);
  });
});

describe('filterCollectionsByQuery', () => {
  const collections: CAT721Balance[] = [
    {
      collectionId: 'abc123_0',
      name: 'Cat Punks',
      count: 3,
      previewLocalIds: [],
      contentType: 'image/png'
    },
    {
      collectionId: 'def456_0',
      name: 'OPCAT Legends',
      count: 1,
      previewLocalIds: [],
      contentType: 'image/png'
    }
  ];

  it('returns everything for an empty query', () => {
    expect(filterCollectionsByQuery(collections, '')).toEqual(collections);
  });

  it('matches name case-insensitively', () => {
    expect(filterCollectionsByQuery(collections, 'punk')).toEqual([collections[0]]);
    expect(filterCollectionsByQuery(collections, 'LEGENDS')).toEqual([collections[1]]);
  });

  it('matches collectionId substring', () => {
    expect(filterCollectionsByQuery(collections, 'def456')).toEqual([collections[1]]);
  });

  it('returns empty when nothing matches', () => {
    expect(filterCollectionsByQuery(collections, 'zzz')).toEqual([]);
  });
});
