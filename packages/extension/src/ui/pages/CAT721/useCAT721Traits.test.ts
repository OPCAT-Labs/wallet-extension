import { renderHook, waitFor } from '@testing-library/react';

import { fetchNftTraits } from './nftTraits';
import { useCAT721Traits } from './useCAT721Traits';

jest.mock('./nftTraits', () => ({
  fetchNftTraits: jest.fn()
}));

const mockFetchTraits = fetchNftTraits as jest.Mock;

const BASE = 'https://tracker.example';

beforeEach(() => {
  mockFetchTraits.mockReset();
});

test('fetches traits for every id and reports loading', async () => {
  mockFetchTraits.mockImplementation(async (_base: string, _c: string, localId: string) => [
    { trait: 'Tier', value: `T${localId}` }
  ]);

  const { result } = renderHook(() => useCAT721Traits(BASE, 'col-a', ['1', '2', '3']));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.traitsById.size).toBe(3);
  expect(result.current.traitsById.get('2')).toEqual([{ trait: 'Tier', value: 'T2' }]);
  expect(mockFetchTraits).toHaveBeenCalledTimes(3);
});

test('serves repeat mounts from the module cache without refetching', async () => {
  mockFetchTraits.mockResolvedValue([{ trait: 'Tier', value: 'Gold' }]);

  const first = renderHook(() => useCAT721Traits(BASE, 'col-b', ['7']));
  await waitFor(() => expect(first.result.current.loading).toBe(false));
  expect(mockFetchTraits).toHaveBeenCalledTimes(1);
  first.unmount();

  const second = renderHook(() => useCAT721Traits(BASE, 'col-b', ['7']));
  await waitFor(() => expect(second.result.current.traitsById.get('7')).toEqual([{ trait: 'Tier', value: 'Gold' }]));
  expect(second.result.current.loading).toBe(false);
  expect(mockFetchTraits).toHaveBeenCalledTimes(1);
});

test('warms the entire owned set with no item cap', async () => {
  // Full pre-warm requirement: every owned item's traits must load so trait facets and
  // trait-value search cover the whole inventory.
  const ids = Array.from({ length: 300 }, (_, i) => String(i));
  mockFetchTraits.mockResolvedValue([{ trait: 'Tier', value: 'Gold' }]);

  const { result } = renderHook(() => useCAT721Traits(BASE, 'col-c', ids));
  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.traitsById.size).toBe(300);
  expect(mockFetchTraits).toHaveBeenCalledTimes(300);
});

test('leaves rejected ids out of the map but keeps the rest', async () => {
  mockFetchTraits.mockImplementation(async (_base: string, _c: string, localId: string) => {
    if (localId === '2') throw new Error('boom');
    return [{ trait: 'Tier', value: 'Gold' }];
  });

  const { result } = renderHook(() => useCAT721Traits(BASE, 'col-d', ['1', '2', '3']));
  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.traitsById.has('2')).toBe(false);
  expect(result.current.traitsById.size).toBe(2);
});

test('does nothing without a content base url', () => {
  const { result } = renderHook(() => useCAT721Traits('', 'col-e', ['1']));

  expect(result.current.loading).toBe(false);
  expect(result.current.traitsById.size).toBe(0);
  expect(mockFetchTraits).not.toHaveBeenCalled();
});
