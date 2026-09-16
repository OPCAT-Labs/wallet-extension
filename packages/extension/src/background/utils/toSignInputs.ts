import { scriptPkToAddress } from '@opcat-labs/wallet-sdk/lib/address';
import { bitcoin } from '@opcat-labs/wallet-sdk/lib/bitcoin-core';
import { NetworkType } from '@opcat-labs/wallet-sdk/lib/network';

import { AddressUserToSignInput, PublicKeyUserToSignInput, ToSignInput, UserToSignInput } from '@/shared/types';

export const SIGHASH_ALL = 0x01;
export const SIGHASH_NONE = 0x02;
// Low bits select the output-commitment mode; 0x80 (ANYONECANPAY) only affects inputs.
const SIGHASH_OUTPUT_MASK = 0x1f;

// The subset of the bitcoinjs / scrypt-ts-opcat Psbt surface these helpers read. OPCAT PSBTs
// carry the previous output only as the `opcatUtxo` key-value, exposed via getInputOutput();
// bitcoinjs PSBTs carry witnessUtxo / nonWitnessUtxo.
interface PsbtInputLike {
  sighashType?: number;
  witnessUtxo?: { script: Uint8Array };
  nonWitnessUtxo?: Uint8Array;
  finalScriptSig?: unknown;
  finalScriptWitness?: unknown;
  partialSig?: unknown[];
  tapKeySig?: unknown;
  tapScriptSig?: unknown[];
}

export interface PsbtLike {
  data: { inputs: PsbtInputLike[] };
  txInputs?: { index: number }[];
  getInputOutput?: (inputIndex: number) => { script: Uint8Array };
}

interface AccountLike {
  address: string;
  pubkey: string;
}

export function isSighashNone(sighashType: number): boolean {
  return (sighashType & SIGHASH_OUTPUT_MASK) === SIGHASH_NONE;
}

/**
 * The type the signer will actually use. Mirrors scrypt-ts-opcat Psbt.getHashForSig: the type
 * declared on the PSBT input wins, then the first whitelisted type, then SIGHASH_ALL.
 */
export function effectiveSighashType(declared: number | undefined, sighashTypes?: number[]): number {
  return declared || (sighashTypes && sighashTypes.length > 0 ? sighashTypes[0] : SIGHASH_ALL);
}

/**
 * Indexes (into the PSBT) of the inputs about to be signed with SIGHASH_NONE, i.e. with a
 * signature that commits to none of the outputs. Works on a parsed PSBT and on the backend's
 * decoded inputInfos alike — both expose `sighashType` per input.
 */
export function findSighashNoneInputs(inputs: { sighashType?: number }[], toSignInputs: ToSignInput[]): number[] {
  return toSignInputs
    .filter((v) => isSighashNone(effectiveSighashType(inputs[v.index]?.sighashType, v.sighashTypes)))
    .map((v) => v.index);
}

export function checkInputIndex(index: unknown, inputCount: number): number {
  const n = index === null || typeof index === 'boolean' ? NaN : Number(index);
  if (!Number.isInteger(n) || n < 0 || n >= inputCount) throw new Error('invalid index in toSignInput');
  return n;
}

export function isInputSigned(input: PsbtInputLike): boolean {
  return Boolean(
    input.finalScriptSig || input.finalScriptWitness || input.tapKeySig || input.partialSig || input.tapScriptSig
  );
}

export function prevOutputScript(psbt: PsbtLike, index: number): Buffer | null {
  if (typeof psbt.getInputOutput === 'function') {
    try {
      return Buffer.from(psbt.getInputOutput(index).script);
    } catch {
      // not an OPCAT input; fall through to the bitcoinjs fields
    }
  }
  const input = psbt.data.inputs[index];
  if (input.witnessUtxo) return Buffer.from(input.witnessUtxo.script);
  if (input.nonWitnessUtxo && psbt.txInputs) {
    const tx = bitcoin.Transaction.fromBuffer(Buffer.from(input.nonWitnessUtxo));
    return tx.outs[psbt.txInputs[index].index].script;
  }
  return null;
}

function scriptBelongsTo(script: Buffer, account: AccountLike, networkType: NetworkType): boolean {
  try {
    return scriptPkToAddress(script, networkType) === account.address;
  } catch {
    return false; // contract or otherwise non-address script
  }
}

/**
 * Explicit `toSignInputs` from a page: every entry must reference an existing input and name the
 * current account. `sighashTypes` is forwarded to the signer as its whitelist; a SIGHASH_NONE
 * request is allowed but surfaced to the user by the approval screen (see findSighashNoneInputs).
 */
export function formatUserToSignInputs(
  psbt: PsbtLike,
  userInputs: UserToSignInput[],
  account: AccountLike
): ToSignInput[] {
  return userInputs.map((input) => {
    const index = checkInputIndex(input.index, psbt.data.inputs.length);

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

    return { index, publicKey: account.pubkey, sighashTypes };
  });
}

/**
 * No `toSignInputs` given: sign exactly the unsigned inputs whose previous output pays the current
 * account. There is deliberately no "sign everything" fallback — a PSBT with none of the account's
 * inputs is refused.
 */
export function selectAccountInputs(psbt: PsbtLike, account: AccountLike, networkType: NetworkType): ToSignInput[] {
  const toSignInputs: ToSignInput[] = [];
  psbt.data.inputs.forEach((input, index) => {
    if (isInputSigned(input)) return;
    const script = prevOutputScript(psbt, index);
    if (!script || !scriptBelongsTo(script, account, networkType)) return;
    toSignInputs.push({
      index,
      publicKey: account.pubkey,
      sighashTypes: input.sighashType ? [input.sighashType] : undefined
    });
  });
  if (toSignInputs.length === 0) {
    throw new Error('no input of the current account found in the psbt');
  }
  return toSignInputs;
}
