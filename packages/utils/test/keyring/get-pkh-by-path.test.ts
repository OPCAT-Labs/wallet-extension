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

  it('should work with hardened derivation paths', () => {
    const keyring = new HdKeyring({
      mnemonic: sampleMnemonic,
      activeIndexes: [0]
    });

    const pkh = keyring.getPKHByPath("m/44'/0'/0'/0/0");

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
});
