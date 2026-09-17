import { expect } from 'chai';
import * as hdkey from 'hdkey';
import * as bip39 from 'bip39';

import { assertNonAccountBip32Path, MAX_BIP32_COMPONENTS, parseBip32Path } from '../../src/keyring';

const sampleMnemonic = 'finish oppose decorate face calm tragic certain desk hour urge dinosaur mango';

function expectThrows(fn: () => unknown, includes?: string) {
  let error: Error | null = null;
  try {
    fn();
  } catch (e) {
    error = e as Error;
  }
  expect(error, 'expected the call to throw').to.not.be.null;
  if (includes) expect(error!.message).to.include(includes);
}

describe('parseBip32Path', () => {
  it('parses plain and hardened components', () => {
    expect(parseBip32Path('m/100/0')).to.deep.eq([
      { index: 100, hardened: false },
      { index: 0, hardened: false }
    ]);
    expect(parseBip32Path("m/100'/0'/1")).to.deep.eq([
      { index: 100, hardened: true },
      { index: 0, hardened: true },
      { index: 1, hardened: false }
    ]);
  });

  it('rejects leading zeros, which the derivation library would read as the canonical index', () => {
    // hdkey parses each component with parseInt, so these are the same child as "44'".
    expect(hdkey.fromMasterSeed(bip39.mnemonicToSeedSync(sampleMnemonic)).derive("m/044'/0'/0'/0/0").publicKey).to.deep.eq(
      hdkey.fromMasterSeed(bip39.mnemonicToSeedSync(sampleMnemonic)).derive("m/44'/0'/0'/0/0").publicKey
    );
    expectThrows(() => parseBip32Path("m/044'/0'/0'/0/0"), 'Invalid BIP32 path format');
    expectThrows(() => parseBip32Path('m/0100/0'), 'Invalid BIP32 path format');
  });

  it('rejects malformed paths', () => {
    for (const path of ['', 'invalid', '100/0', 'm/', 'm/abc', 'm/-1', 'm/1.5', "m/1''", 'm/100/0;DROP TABLE']) {
      expectThrows(() => parseBip32Path(path));
    }
  });

  it('rejects indexes outside the BIP32 range', () => {
    expect(parseBip32Path('m/2147483647')).to.deep.eq([{ index: 2147483647, hardened: false }]);
    expectThrows(() => parseBip32Path('m/2147483648'), 'out of range');
  });

  it('bounds the component count', () => {
    const ok = 'm' + '/0'.repeat(MAX_BIP32_COMPONENTS);
    expect(parseBip32Path(ok)).to.have.lengthOf(MAX_BIP32_COMPONENTS);
    expectThrows(() => parseBip32Path('m' + '/0'.repeat(MAX_BIP32_COMPONENTS + 1)), 'at most');
  });
});

describe('assertNonAccountBip32Path', () => {
  it('blocks the standard purposes however they are spelled', () => {
    for (const path of ["m/44'/0'/0'/0/0", "m/49'/0'/0'/0/0", "m/84'/0'/0'/0/0", "m/86'/0'/0'/0/0"]) {
      expectThrows(() => assertNonAccountBip32Path(path), 'BIP44/49/84/86');
    }
    // The textual startsWith() guard this replaced let these through.
    expectThrows(() => assertNonAccountBip32Path("m/044'/0'/0'/0/0"), 'Invalid BIP32 path format');
    expectThrows(() => assertNonAccountBip32Path("m/0000044'/0'/0'/0/0"), 'Invalid BIP32 path format');
  });

  it('does not block the unhardened namesakes of those purposes', () => {
    expect(assertNonAccountBip32Path('m/44/0/0/0/0')).to.have.lengthOf(5);
  });

  it("blocks the keyring's own account tree, including custom hd paths", () => {
    expectThrows(() => assertNonAccountBip32Path("m/0'/0'/0'/0/5", "m/0'/0'/0'/0"), 'own account tree');
    expectThrows(() => assertNonAccountBip32Path("m/0'/0'/0'/0", "m/0'/0'/0'/0"), 'own account tree');
    // A sibling of the account tree is fine.
    expect(assertNonAccountBip32Path("m/0'/0'/1'/0/5", "m/0'/0'/0'/0")).to.have.lengthOf(5);
    // Hardening has to match to count as a prefix.
    expect(assertNonAccountBip32Path("m/0/0/0/0/5", "m/0'/0'/0'/0")).to.have.lengthOf(5);
  });

  it('ignores an unparseable configured hd path rather than failing open or closed', () => {
    expect(assertNonAccountBip32Path('m/100/0', 'not-a-path')).to.have.lengthOf(2);
    expectThrows(() => assertNonAccountBip32Path("m/44'/0", 'not-a-path'), 'BIP44/49/84/86');
  });

  it('allows ordinary custom paths', () => {
    for (const path of ['m/100/0', 'm/100/1', 'm/200/0', "m/100'/0"]) {
      expect(assertNonAccountBip32Path(path)).to.be.an('array');
    }
  });
});
