import { expect } from 'chai';
import { HdKeyring } from '../../src/keyring';

const sampleMnemonic = 'finish oppose decorate face calm tragic certain desk hour urge dinosaur mango';

describe('getPKHByPath', () => {
  it('should return a 40-char hex string (20 bytes)', () => {
    const keyring = new HdKeyring({
      mnemonic: sampleMnemonic,
      activeIndexes: [0]
    });

    const pkh = keyring.getPKHByPath('m/100/0');

    expect(pkh).to.be.a('string');
    expect(pkh).to.have.lengthOf(40);
    expect(pkh).to.match(/^[0-9a-f]{40}$/);
  });

  it('should return consistent results for the same path', () => {
    const keyring = new HdKeyring({
      mnemonic: sampleMnemonic,
      activeIndexes: [0]
    });

    const pkh1 = keyring.getPKHByPath('m/100/0');
    const pkh2 = keyring.getPKHByPath('m/100/0');

    expect(pkh1).to.eq(pkh2);
  });

  it('should return different PKH for different paths', () => {
    const keyring = new HdKeyring({
      mnemonic: sampleMnemonic,
      activeIndexes: [0]
    });

    const pkh1 = keyring.getPKHByPath('m/100/0');
    const pkh2 = keyring.getPKHByPath('m/100/1');
    const pkh3 = keyring.getPKHByPath('m/200/0');

    expect(pkh1).to.not.eq(pkh2);
    expect(pkh1).to.not.eq(pkh3);
    expect(pkh2).to.not.eq(pkh3);
  });

  it('should return different PKH for different mnemonics', () => {
    const keyring1 = new HdKeyring({
      mnemonic: sampleMnemonic,
      activeIndexes: [0]
    });
    const keyring2 = new HdKeyring({
      mnemonic: 'glue peanut huge wait vicious depend copper ribbon access boring walk point',
      activeIndexes: [0]
    });

    const pkh1 = keyring1.getPKHByPath('m/100/0');
    const pkh2 = keyring2.getPKHByPath('m/100/0');

    expect(pkh1).to.not.eq(pkh2);
  });

  it('should work with hardened derivation paths (non-standard)', () => {
    const keyring = new HdKeyring({
      mnemonic: sampleMnemonic,
      activeIndexes: [0]
    });

    const pkh = keyring.getPKHByPath("m/100'/0'/0");

    expect(pkh).to.be.a('string');
    expect(pkh).to.have.lengthOf(40);
    expect(pkh).to.match(/^[0-9a-f]{40}$/);
  });

  it('should throw if keyring is not initialized', () => {
    const keyring = new HdKeyring();

    let error: Error | null = null;
    try {
      keyring.getPKHByPath('m/100/0');
    } catch (e) {
      error = e as Error;
    }

    expect(error).to.not.be.null;
    expect(error!.message).to.include('Not initialized');
  });

  describe('path validation', () => {
    let keyring: HdKeyring;
    beforeEach(() => {
      keyring = new HdKeyring({
        mnemonic: sampleMnemonic,
        activeIndexes: [0]
      });
    });

    it('should reject invalid path format', () => {
      const invalidPaths = ['', 'invalid', '100/0', 'm/', 'm/abc', 'm/100/0;DROP TABLE'];
      for (const path of invalidPaths) {
        let error: Error | null = null;
        try {
          keyring.getPKHByPath(path);
        } catch (e) {
          error = e as Error;
        }
        expect(error, `Expected error for path: ${path}`).to.not.be.null;
      }
    });

    it('should block standard BIP44 path', () => {
      let error: Error | null = null;
      try {
        keyring.getPKHByPath("m/44'/0'/0'/0/0");
      } catch (e) {
        error = e as Error;
      }
      expect(error).to.not.be.null;
      expect(error!.message).to.include('BIP44/49/84/86');
    });

    it('should block standard BIP49 path', () => {
      let error: Error | null = null;
      try {
        keyring.getPKHByPath("m/49'/0'/0'/0/0");
      } catch (e) {
        error = e as Error;
      }
      expect(error).to.not.be.null;
      expect(error!.message).to.include('BIP44/49/84/86');
    });

    it('should block standard BIP84 path', () => {
      let error: Error | null = null;
      try {
        keyring.getPKHByPath("m/84'/0'/0'/0/0");
      } catch (e) {
        error = e as Error;
      }
      expect(error).to.not.be.null;
      expect(error!.message).to.include('BIP44/49/84/86');
    });

    it('should block standard BIP86 path', () => {
      let error: Error | null = null;
      try {
        keyring.getPKHByPath("m/86'/0'/0'/0/0");
      } catch (e) {
        error = e as Error;
      }
      expect(error).to.not.be.null;
      expect(error!.message).to.include('BIP44/49/84/86');
    });

    it('should allow custom paths', () => {
      const validPaths = ['m/100/0', 'm/100/1', 'm/200/0', "m/100'/0"];
      for (const path of validPaths) {
        const pkh = keyring.getPKHByPath(path);
        expect(pkh, `Expected valid PKH for path: ${path}`).to.match(/^[0-9a-f]{40}$/);
      }
    });
  });
});
