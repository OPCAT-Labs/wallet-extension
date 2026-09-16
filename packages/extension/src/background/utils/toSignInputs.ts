import { scriptPkToAddress } from '@opcat-labs/wallet-sdk/lib/address';
import { bitcoin } from '@opcat-labs/wallet-sdk/lib/bitcoin-core';
import { NetworkType } from '@opcat-labs/wallet-sdk/lib/network';

import { AddressUserToSignInput, PublicKeyUserToSignInput, ToSignInput, UserToSignInput } from '@/shared/types';

export const SIGHASH_ALL = 0x01;

// Page-facing signing only ever produces SIGHASH_ALL signatures. Any other type (NONE, SINGLE,
// ANYONECANPAY combinations) lets the requester reuse the signature under outputs the approval
// screen never showed, so it is refused up front instead of being echoed into the signer's
// whitelist. Internal flows that need a contract-requested sighash go through KeyringSigner,
// whose options are built by ExtPsbt rather than supplied by a page.
const ALLOWED_SIGHASH_TYPES: readonly number[] = [SIGHASH_ALL];

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

export function assertAllowedSighashTypes(sighashTypes: unknown) {
  if (sighashTypes === undefined || sighashTypes === null) return;
  if (!Array.isArray(sighashTypes)) throw new Error('invalid sighash type in toSignInput');
  const types = sighashTypes.map(Number);
  if (types.some(isNaN)) throw new Error('invalid sighash type in toSignInput');
  const disallowed = types.find((t) => !ALLOWED_SIGHASH_TYPES.includes(t));
  if (disallowed !== undefined) {
    throw new Error(`sighash type ${disallowed} is not allowed; only SIGHASH_ALL (0x01) is supported`);
  }
}

function assertInputSighashAllowed(input: PsbtInputLike, index: number) {
  if (input.sighashType !== undefined && !ALLOWED_SIGHASH_TYPES.includes(input.sighashType)) {
    throw new Error(
      `input ${index} declares sighash type ${input.sighashType}; only SIGHASH_ALL (0x01) is supported`
    );
  }
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
 * Explicit `toSignInputs` from a page: every entry must reference an existing input, name the
 * current account, and may only ask for SIGHASH_ALL.
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

    assertAllowedSighashTypes(input.sighashTypes);
    assertInputSighashAllowed(psbt.data.inputs[index], index);

    return { index, publicKey: account.pubkey, sighashTypes: [SIGHASH_ALL] };
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
    assertInputSighashAllowed(input, index);
    toSignInputs.push({ index, publicKey: account.pubkey, sighashTypes: [SIGHASH_ALL] });
  });
  if (toSignInputs.length === 0) {
    throw new Error('no input of the current account found in the psbt');
  }
  return toSignInputs;
}

/**
 * Synchronous pre-check for the approval gate, so a request that could never be signed under the
 * SIGHASH_ALL policy is rejected before an approval window opens. With explicit toSignInputs only
 * the referenced inputs are checked; otherwise every unsigned input is.
 */
export function assertSignRequestSighashAllowed(psbt: PsbtLike, userInputs?: UserToSignInput[]) {
  if (userInputs) {
    userInputs.forEach((input) => {
      assertAllowedSighashTypes(input.sighashTypes);
      const index = checkInputIndex(input.index, psbt.data.inputs.length);
      assertInputSighashAllowed(psbt.data.inputs[index], index);
    });
    return;
  }
  psbt.data.inputs.forEach((input, index) => {
    if (!isInputSigned(input)) assertInputSighashAllowed(input, index);
  });
}
