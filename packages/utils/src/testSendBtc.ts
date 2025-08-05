


import { SimpleKeyring } from "./keyring/simple-keyring";
import { sendBTC } from "./tx-helpers/send-btc";
import { AddressType } from "./types";



// todo remove this file

const main = async () => {
    const keyring = new SimpleKeyring(['4c64e36eb0348efd09bcfdee6b939b21337cb9208d2d67e7ae09a511a3e2c2da'])
    const sendBtc = await sendBTC({
        btcUtxos: [
            {
                "txid": "e09e3f68559073a0f64c0ba91179757833a5f3c6e913299fdc5a76db2e2033af",
                "vout": 0,
                "satoshis": 9999614,
                "scriptPk": "76a914584711b7ea3ac2e738323ee22d434955a88dffbb88ac",
                "data": "",
                "addressType": AddressType.P2PKH,
                "pubkey": "039ff2b789dd2b2862ec0a95d7b5a02dff02641fce54213fe48f2e4fb532f4e626",
                "inscriptions": [],
                "atomicals": []
            },
            {
                "txid": "a13dcd44b897e3c115153431837de13535a08a1d544518741e886daffcd6741c",
                "vout": 0,
                "satoshis": 9999807,
                "scriptPk": "76a914584711b7ea3ac2e738323ee22d434955a88dffbb88ac",
                "data": "",
                "addressType": AddressType.P2PKH,
                "pubkey": "039ff2b789dd2b2862ec0a95d7b5a02dff02641fce54213fe48f2e4fb532f4e626",
                "inscriptions": [],
                "atomicals": []
            }
        ],
        tos: [
            {
                address: 'moZitumN2WVP11qej8cUtuSGUTdRyWiADT',
                satoshis: 10000
            }
        ],
        networkType: 1,
        changeAddress: 'moZitumN2WVP11qej8cUtuSGUTdRyWiADT',
        feeRate: 1,
        isOpcat: true,
    })
    keyring.signTransaction(sendBtc.psbt as any, sendBtc.toSignInputs as any)
    sendBtc.psbt.finalizeAllInputs()
    console.log(sendBtc.psbt.extractTransaction().toHex())
}
main()
