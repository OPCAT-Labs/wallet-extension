/**
 * API Client for E2E testing
 * Direct API calls to the CATENA wallet backend
 */

const API_BASE_URL = 'https://wallet-api-testnet.opcatlabs.io';

export interface CAT20Balance {
  tokenId: string;
  amount: string;
  decimals: number;
  symbol: string;
  name: string;
}

export interface CAT20ListResponse {
  list: CAT20Balance[];
  total: number;
}

/**
 * Get CAT20 token list for an address
 * @param address - Wallet address
 * @param cursor - Pagination cursor (1-based)
 * @param size - Page size
 * @returns CAT20 token list and total count
 */
export async function getCAT20List(
  address: string,
  cursor: number = 1,
  size: number = 50
): Promise<CAT20ListResponse> {
  const url = `${API_BASE_URL}/v5/cat20/list?address=${address}&cursor=${cursor}&size=${size}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const json = await response.json();

  if (json.code !== 0) {
    throw new Error(`API error: ${json.msg}`);
  }

  return json.data;
}

/**
 * Find a specific token by symbol in the token list
 * @param address - Wallet address
 * @param symbol - Token symbol to find
 * @returns The token balance if found, undefined otherwise
 */
export async function findTokenBySymbol(
  address: string,
  symbol: string
): Promise<CAT20Balance | undefined> {
  const { list } = await getCAT20List(address, 1, 100);
  return list.find(token => token.symbol === symbol);
}

/**
 * Get decimal amount from raw amount
 * @param amount - Raw amount string
 * @param decimals - Token decimals
 * @returns Decimal amount as number
 */
export function toDecimalAmount(amount: string, decimals: number): number {
  const divisor = Math.pow(10, decimals);
  return parseInt(amount) / divisor;
}

// CAT721 Balance interface
export interface CAT721Balance {
  collectionId: string;
  name: string;
  symbol: string;
  count: number;
  contentType: string;
  previewLocalIds: string[];
}

export interface CAT721ListResponse {
  list: CAT721Balance[];
  total: number;
}

/**
 * Get CAT721 collection list for an address
 * @param address - Wallet address
 * @param cursor - Pagination cursor (1-based)
 * @param size - Page size
 * @returns CAT721 collection list and total count
 */
export async function getCAT721List(
  address: string,
  cursor: number = 1,
  size: number = 50
): Promise<CAT721ListResponse> {
  const url = `${API_BASE_URL}/v5/cat721/collection/list?address=${address}&cursor=${cursor}&size=${size}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const json = await response.json();

  if (json.code !== 0) {
    throw new Error(`API error: ${json.msg}`);
  }

  return json.data;
}

/**
 * Find a specific CAT721 collection by name
 * @param address - Wallet address
 * @param name - Collection name to find
 * @returns The collection balance if found, undefined otherwise
 */
export async function findCAT721ByName(
  address: string,
  name: string
): Promise<CAT721Balance | undefined> {
  const { list } = await getCAT721List(address, 1, 100);
  return list.find(collection => collection.name === name);
}
