
import { ExtPsbt, PrivateKey, crypto, Network, Networks, SignOptions, Signer, hexToUint8Array, SupportedNetwork, uint8ArrayToHex, PublicKey, fromSupportedNetwork } from '@opcat-labs/scrypt-ts-opcat'
import { DisplayedKeyring, Keyring } from '@/background/service/keyring';
import { Account, AddressUserToSignInput, PublicKeyUserToSignInput, SignPsbtOptions, ToSignInput, WalletKeyring } from '@/shared/types';
import { KEYRING_TYPE } from '@/shared/constant';
import {
  keyringService,
} from '@/background/service';
/**
 * An implemention of a simple signer which should just be used in nodejs environments.
 * @category Signer
 */
export class KeyringSigner implements Signer {

  public readonly network: Network;
  constructor(
    private account: Account,
    private keyring: Keyring,
    network: SupportedNetwork,
  ) {
    this.network = fromSupportedNetwork(network)
  }

  /**
   * Gets the address derived from the signer's private key and network.
   * @returns A promise resolving to the address string.
   */
  async getAddress(): Promise<string> {
    return Promise.resolve(
      PublicKey.fromString(this.account.pubkey).toAddress(this.network).toString(),
    );
  }

  /**
   * Returns the public key in hexadecimal format derived from the private key.
   * @returns A promise that resolves to the public key as a hex string.
   */
  async getPublicKey(): Promise<string> {
    return this.account.pubkey
  }

  /**
   * Signs a PSBT (Partially Signed Bitcoin Transaction) with the signer's key pair.
   * 
   * @param psbtHex - The PSBT in hexadecimal format to be signed
   * @param options - Optional signing configuration including inputs to sign
   * @returns Promise resolving to the signed PSBT in hexadecimal format
   * 
   * @remarks
   * - If options are provided, only specified inputs matching the signer's address/public key will be signed
   * - If no options are provided, all inputs will be signed with SIGHASH_ALL
   */
  async signPsbt(psbtHex: string, options?: SignOptions): Promise<string> {
    let psbt:any = ExtPsbt.fromHex(psbtHex);
    const toSignInputs = await this.formatOptionsToSignInputs(psbtHex, options as SignPsbtOptions)
    
    const isKeystone = this.keyring.type === KEYRING_TYPE.KeystoneKeyring;
    if (isKeystone) {
      throw new Error('we donot support keystone now')
    }
    
    psbt.data.inputs.forEach((input, index) => {
      const isSigned =
        input.finalScriptSig || input.finalScriptWitness || input.tapKeySig || input.partialSig || input.tapScriptSig;
      if (isSigned) {
        return;
      }

      const isToBeSigned = toSignInputs.some((v) => v.index === index);
      if (!isToBeSigned) {
        return;
      }
    });

    psbt = await keyringService.signTransaction(this.keyring, psbt as any, toSignInputs);
    (psbt as any)._isSealed = true;
    if (options?.autoFinalized) {
      psbt.finalizeAllInputs()
    }
    return psbt.toHex();
  }
  /**
   * Signs multiple PSBTs (Partially Signed Bitcoin Transactions) in parallel.
   * @param reqs Array of objects containing PSBT hex strings and optional signing options
   * @returns Promise resolving to an array of signed PSBT hex strings
   */
  signPsbts(reqs: { psbtHex: string; options?: SignOptions }[]): Promise<string[]> {
    return Promise.all(reqs.map((req) => this.signPsbt(req.psbtHex, req.options)));
  }


  formatOptionsToSignInputs = async (_psbt: string | ExtPsbt, options?: SignPsbtOptions) => {
    const account = this.account
    if (!account) throw null;

    let toSignInputs: ToSignInput[] = [];
    if (options && options.toSignInputs) {
      // We expect userToSignInputs objects to be similar to ToSignInput interface,
      // but we allow address to be specified in addition to publicKey for convenience.
      toSignInputs = options.toSignInputs.map((input) => {
        const index = Number(input.index);
        if (isNaN(index)) throw new Error('invalid index in toSignInput');

        if (!(input as AddressUserToSignInput).address && !(input as PublicKeyUserToSignInput).publicKey) {
          throw new Error('no address or public key in toSignInput');
        }

        if ((input as AddressUserToSignInput).address && (input as AddressUserToSignInput).address != account.address) {
          throw new Error('invalid address in toSignInput');
        }

        if (
          (input as PublicKeyUserToSignInput).publicKey &&
          (input as PublicKeyUserToSignInput).publicKey != account.pubkey
        ) {
          throw new Error('invalid public key in toSignInput');
        }

        const sighashTypes = input.sighashTypes?.map(Number);
        if (sighashTypes?.some(isNaN)) throw new Error('invalid sighash type in toSignInput');

        return {
          index,
          publicKey: account.pubkey,
          sighashTypes
        };
      });
    } else {
      throw new Error('options cannot be optional')
    }

    return toSignInputs;
  }

}
