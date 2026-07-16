/**
 * CAT-721 NFT metadata attributes (traits) helpers.
 *
 * Traits are fetched per-NFT from the tracker/openapi at the SAME base URL used for NFT content
 * (see CAT721Preview) but WITHOUT the trailing `/content`:
 *   GET {contentBaseUrl}/api/v1/collections/{collectionId}/localId/{localId}
 *
 * `extractTraits` is a pure function (no React / no fetch) so it can be unit-tested in isolation.
 */

export interface NftTrait {
  trait: string;
  value: string;
}

interface NftMetadataAttribute {
  trait_type?: string;
  value?: string | number | null;
}

export interface NftMetadata {
  name?: string;
  description?: string;
  attributes?: NftMetadataAttribute[];
}

interface NftLocalIdInfo {
  collectionId: string;
  localId: string;
  mintTxid?: string;
  metadata?: NftMetadata;
}

interface NftLocalIdEnvelope {
  code: number;
  msg: string;
  data?: NftLocalIdInfo;
}

/**
 * Extract displayable traits from a per-NFT `metadata` blob.
 * Keeps only entries whose `trait_type` is a non-empty string and whose `value` is non-nullish,
 * coercing each value to a string. Returns `[]` when there are no usable attributes.
 */
export function extractTraits(metadata: NftMetadata | undefined | null): NftTrait[] {
  const attrs = metadata?.attributes;
  if (!Array.isArray(attrs)) return [];
  return attrs
    .filter(a => a && typeof a.trait_type === 'string' && a.trait_type !== '' && a.value != null)
    .map(a => ({ trait: a.trait_type as string, value: String(a.value) }));
}

/**
 * Fetch and extract the traits for a single NFT directly from the tracker/openapi.
 * Mirrors the existing direct-fetch content pattern in CAT721Preview. Returns `[]` on any error
 * (missing base URL, network failure, non-zero envelope code, or no usable attributes).
 */
export async function fetchNftTraits(
  contentBaseUrl: string,
  collectionId: string,
  localId: string
): Promise<NftTrait[]> {
  if (!contentBaseUrl) return [];
  const res = await fetch(`${contentBaseUrl}/api/v1/collections/${collectionId}/localId/${localId}`);
  if (!res.ok) return [];
  const envelope = (await res.json()) as NftLocalIdEnvelope;
  if (!envelope || envelope.code !== 0) return [];
  return extractTraits(envelope.data?.metadata);
}
