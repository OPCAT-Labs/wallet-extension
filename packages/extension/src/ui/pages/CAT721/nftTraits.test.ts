import { extractTraits } from './nftTraits';

describe('extractTraits', () => {
  it('maps normal string attributes to traits', () => {
    expect(
      extractTraits({
        attributes: [
          { trait_type: 'Background', value: 'Blue' },
          { trait_type: 'Eyes', value: 'Laser' }
        ]
      })
    ).toEqual([
      { trait: 'Background', value: 'Blue' },
      { trait: 'Eyes', value: 'Laser' }
    ]);
  });

  it('coerces numeric values to strings', () => {
    expect(extractTraits({ attributes: [{ trait_type: 'Level', value: 42 }] })).toEqual([
      { trait: 'Level', value: '42' }
    ]);
  });

  it('drops entries with an empty trait_type or nullish value', () => {
    expect(
      extractTraits({
        attributes: [
          { trait_type: '', value: 'ignored' },
          { trait_type: 'Missing', value: null },
          { trait_type: 'NoValue' },
          { value: 'noTraitType' } as { value: string },
          { trait_type: 'Kept', value: 'yes' }
        ]
      })
    ).toEqual([{ trait: 'Kept', value: 'yes' }]);
  });

  it('returns an empty array when metadata or attributes are missing', () => {
    expect(extractTraits(undefined)).toEqual([]);
    expect(extractTraits(null)).toEqual([]);
    expect(extractTraits({})).toEqual([]);
    expect(extractTraits({ attributes: [] })).toEqual([]);
  });
});
