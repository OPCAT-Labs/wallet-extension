import bitcore from 'bitcore-lib';
import { ECPairInterface } from 'ecpair';

export function signMessageOfECDSA(privateKey: ECPairInterface, text: string) {
  const keyPair = privateKey;
  const message = new bitcore.Message(text);
  return message.sign(new bitcore.PrivateKey(keyPair.privateKey));
}

export function verifyMessageOfECDSA(publicKey: string, text: string, sig: string) {
  const message = new bitcore.Message(text);

  try {
    const signature = bitcore.crypto.Signature.fromCompact(Buffer.from(sig, 'base64'));
    const hash = message.magicHash();
    const pubkeyInSig = bitcore.crypto.ECDSA.recoverPublicKey(hash, signature);

    if (pubkeyInSig.toString() !== publicKey) {
      return false;
    }

    return bitcore.crypto.ECDSA.verify(hash, signature, pubkeyInSig);
  } catch {
    return false;
  }
}
