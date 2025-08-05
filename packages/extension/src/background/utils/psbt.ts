import { Psbt } from '@opcat-labs/scrypt-ts-opcat';
import { bitcoin } from '@unisat/wallet-sdk/lib/bitcoin-core';

export function psbtFromHex<T=bitcoin.Psbt>(hex: string): T {
    // let error: Error
    // try {
    //     return bitcoin.Psbt.fromHex(hex) as T;
    // } catch (e) {
    //     // error = e as Error
    // }
    return Psbt.fromHex(hex) as T
}

export function psbtFromBase64<T=bitcoin.Psbt>(base64: string): T {
    // let error: Error
    // try {
    //     return bitcoin.Psbt.fromBase64(base64) as T;
    // } catch (e) {
    //     // error = e as Error
    // }
    return Psbt.fromBase64(base64) as T
}