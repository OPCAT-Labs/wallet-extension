import { expect } from 'chai';

import { NetworkType } from '../../src/network';
import { Transaction } from '../../src/transaction/transaction';

const CHANGE_ADDRESS = '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH';
const TO_ADDRESS = '1BitcoinEaterAddressDontSendf59kuE';

function newTx() {
  const tx = new Transaction();
  tx.setNetworkType(NetworkType.MAINNET);
  tx.setFeeRate(1);
  tx.setChangeAddress(CHANGE_ADDRESS);
  return tx;
}

describe('Transaction output guards', () => {
  describe('removeChangeOutput', () => {
    it('does nothing when there is no change output', () => {
      // splice(-1, 1) used to drop the last output — the recipient's — and its value became
      // miner fee.
      const tx = newTx();
      tx.addOutput(TO_ADDRESS, 10000);

      tx.removeChangeOutput();

      expect(tx.outputs).to.have.lengthOf(1);
      expect(tx.outputs[0].address).to.eq(TO_ADDRESS);
      expect(tx.outputs[0].value).to.eq(10000);
    });

    it('removes only the change output when there is one', () => {
      const tx = newTx();
      tx.addOutput(TO_ADDRESS, 10000);
      tx.addChangeOutput(5000);

      tx.removeChangeOutput();

      expect(tx.outputs).to.have.lengthOf(1);
      expect(tx.outputs[0].address).to.eq(TO_ADDRESS);
    });

    it('is idempotent', () => {
      const tx = newTx();
      tx.addOutput(TO_ADDRESS, 10000);
      tx.addChangeOutput(5000);

      tx.removeChangeOutput();
      tx.removeChangeOutput();

      expect(tx.outputs).to.have.lengthOf(1);
      expect(tx.outputs[0].address).to.eq(TO_ADDRESS);
    });
  });

  describe('removeRecentOutputs', () => {
    it('does nothing for a count of zero', () => {
      // splice(-0) is splice(0), which emptied the whole list.
      const tx = newTx();
      tx.addOutput(TO_ADDRESS, 10000);
      tx.addOutput(CHANGE_ADDRESS, 20000);

      tx.removeRecentOutputs(0);

      expect(tx.outputs).to.have.lengthOf(2);
    });

    it('does nothing for a negative count', () => {
      const tx = newTx();
      tx.addOutput(TO_ADDRESS, 10000);

      tx.removeRecentOutputs(-1);

      expect(tx.outputs).to.have.lengthOf(1);
    });

    it('removes the requested number of trailing outputs', () => {
      const tx = newTx();
      tx.addOutput(TO_ADDRESS, 10000);
      tx.addOutput(CHANGE_ADDRESS, 20000);

      tx.removeRecentOutputs(1);

      expect(tx.outputs).to.have.lengthOf(1);
      expect(tx.outputs[0].address).to.eq(TO_ADDRESS);
    });
  });
});
