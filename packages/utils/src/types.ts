interface BaseUserToSignInput {
  index: number;
  sighashTypes?: number[] | undefined;
}

export interface AddressUserToSignInput extends BaseUserToSignInput {
  address: string;
}

export interface PublicKeyUserToSignInput extends BaseUserToSignInput {
  publicKey: string;
}

export type UserToSignInput = AddressUserToSignInput | PublicKeyUserToSignInput;

export interface SignPsbtOptions {
  autoFinalized?: boolean; // whether to finalize psbt automatically
  toSignInputs?: UserToSignInput[];
}

export interface ToSignInput {
  index: number; // index of input to sign
  publicKey: string; // public key in hex format
  sighashTypes?: number[]; // sighash types to sign
}

export interface UnspentOutput {
  txid: string;
  vout: number;
  satoshis: number;
  scriptPk: string;
  pubkey: string;
  data?: string
  addressType: AddressType;
  rawtx?: string;
}

export enum AddressType {
  P2PKH,
  UNKNOWN
}
