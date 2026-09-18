/**
 * BIP32 path parsing shared by every layer that guards `getPKHByPath`.
 *
 * The guard used to be a textual `startsWith("m/44'")` test while the derivation library parses
 * each component with `parseInt`, so `m/044'/0'/0'/0/0` passed the check and derived exactly the
 * blocked node. Parsing to (index, hardened) tuples once, here, keeps the provider pre-check and
 * the keyring in agreement.
 */

export interface Bip32Component {
  index: number;
  hardened: boolean;
}

const HARDENED_OFFSET = 0x80000000;

/** BIP32 paths in practice have <= 10 levels; each extra component costs one HMAC + EC operation. */
export const MAX_BIP32_COMPONENTS = 16;

/** Purposes whose account trees the wallet itself derives from. */
const BLOCKED_PURPOSES = [44, 49, 84, 86];

/**
 * Parse a BIP32 path into normalised components.
 *
 * Rejects anything the derivation library would read as a different path than it looks like
 * (leading zeros), indexes outside the BIP32 range, and unbounded component counts.
 */
export function parseBip32Path(path: string): Bip32Component[] {
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: must be a non-empty string');
  }
  const parts = path.split('/');
  if (parts[0] !== 'm' || parts.length < 2) {
    throw new Error('Invalid BIP32 path format. Expected format: m/number/number (e.g. m/100/0)');
  }
  const components = parts.slice(1);
  if (components.length > MAX_BIP32_COMPONENTS) {
    throw new Error(`Invalid BIP32 path: at most ${MAX_BIP32_COMPONENTS} components are allowed`);
  }
  return components.map((component) => {
    const hardened = component.endsWith("'");
    const digits = hardened ? component.slice(0, -1) : component;
    // No leading zeros: "044'" and "44'" are the same child to the derivation library.
    if (!/^(0|[1-9]\d*)$/.test(digits)) {
      throw new Error('Invalid BIP32 path format. Expected format: m/number/number (e.g. m/100/0)');
    }
    const index = Number(digits);
    if (!Number.isSafeInteger(index) || index >= HARDENED_OFFSET) {
      throw new Error('Invalid BIP32 path: component index out of range');
    }
    return { index, hardened };
  });
}

function isPrefixOf(prefix: Bip32Component[], path: Bip32Component[]): boolean {
  return (
    prefix.length <= path.length &&
    prefix.every((component, i) => component.index === path[i].index && component.hardened === path[i].hardened)
  );
}

/**
 * Throw when `path` would derive inside a tree the wallet uses for its own accounts: a standard
 * BIP44/49/84/86 purpose, or the keyring's own `hdPath` when one is given (a wallet created with a
 * custom derivation path is not covered by the purpose list).
 */
export function assertNonAccountBip32Path(path: string, accountHdPath?: string): Bip32Component[] {
  const components = parseBip32Path(path);

  const purpose = components[0];
  if (purpose.hardened && BLOCKED_PURPOSES.includes(purpose.index)) {
    throw new Error(
      'Standard BIP44/49/84/86 derivation paths are not allowed for getPKHByPath to prevent address tracking'
    );
  }

  if (accountHdPath) {
    // An unparseable configured path is not a reason to reject the request; the purpose check above
    // still applies.
    let account: Bip32Component[] | null = null;
    try {
      account = parseBip32Path(accountHdPath);
    } catch {
      account = null;
    }
    if (account && isPrefixOf(account, components)) {
      throw new Error(
        "Paths inside the wallet's own account tree are not allowed for getPKHByPath to prevent address tracking"
      );
    }
  }

  return components;
}
