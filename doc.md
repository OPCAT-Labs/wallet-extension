# Browser Detection

To verify if the browser is running Opcat Wallet, copy and paste the code snippet below in the developer console of your web browser:

```javascript
if (typeof window.opcat !== "undefined") {
  console.log("Opcat Wallet is installed!");
}
```

You can review the full API for the `window.opcat` object

Additionally, since many wallets have forked Opcat's code, multiple window.opcat objects may conflict with each other. To avoid such conflicts, we have introduced a new opcat_wallet object.

```javascript
if (typeof window.opcat_wallet !== "undefined") {
  console.log("Opcat Wallet is installed!");
}
```

# Connect to the Opcat Wallet

"Connecting" or "logging in" to Opcat Wallet effectively means "to access the user's Bitcoin account(s)".

You should only initiate a connection request in response to direct user action, such as clicking a button. You should always disable the "connect" button while the connection request is pending. You should never initiate a connection request on page load.

We recommend that you provide a button to allow the user to connect Opcat Wallet to your dapp. Clicking this button should call the following method:

## Methods

### requestAccounts

```
opcat.requestAccounts()
```

Connect the current account.

**Parameters**

none

**Returns**

- `Promise` returns `string[]` : Address of current account.

```javascript
try {
  let accounts = await window.opcat.requestAccounts();
  console.log('connect success', accounts);
} catch (e) {
  console.log('connect failed');
}
> connect success ['tb1qrn7tvhdf6wnh790384ahj56u0xaa0kqgautnnz']
```

---

### disconnect

```
opcat.disconnect()
```

Disconnect the current account.

**Parameters**

none

**Returns**

- `Promise` returns `void`

```javascript
window.opcat.disconnect();
```

# Access a user's accounts

Once the dApp successfully connects to the wallet, you can use the following method to obtain the wallet's address and public key.

## Method

### getAccounts

```
opcat.getAccounts()
```

Get address of current account

**Parameters**

none

**Returns**

- `Promise` - `string`: address of current account

**Example**

```javascript
try {
    let res = await window.opcat.getAccounts();
    console.log(res)
} catch (e) {
    console.log(e);
}

> ["tb1qrn7tvhdf6wnh790384ahj56u0xaa0kqgautnnz"]
```

**Additional Note**

- Although this API returns an array, it currently returns at most one record, which represents the wallet's currently active address.

- When the wallet is not connected, it returns an empty array.

---

### getPublicKey

```
 opcat.getPublicKey()
```

Get publicKey of current account.

**Parameters**

none

**Returns**

- `Promise` - `string`: publicKey

**Example**

```javascript
try {
    let res = await window.opcat.getPublicKey();
    console.log(res)
} catch (e) {
    console.log(e);
}

> 03cbaedc26f03fd3ba02fc936f338e980c9e2172c5e23128877ed46827e935296f

```

**Additional Note**

- For P2TR addresses, the returned value will be the original public key, not the tweaked one

---

### accountsChanged

```javascript
opcat.on('accountsChanged', handler: (accounts: Array<string>) => void);
opcat.removeListener('accountsChanged', handler: (accounts: Array<string>) => void);
```

The `accountsChanged` will be emitted whenever the user's exposed account address changes.

## Bitcoin Assets

The following provides several methods to list the wallet's assets and construct corresponding send transactions.

### getBalance

```
opcat.getBalance()
```

Get BTC balance

**Parameters**

none

**Returns**

- `Promise` - `Object`:
  - `confirmed` - `number` : the confirmed satoshis
  - `unconfirmed` - `number` : the unconfirmed satoshis
  - `total` - `number` : the total satoshis

**Example**

```javascript
try {
    let res = await window.opcat.getBalance();
    console.log(res)
} catch (e) {
    console.log(e);
}

> {
    "confirmed":0,
    "unconfirmed":100000,
    "total":100000
}

```

### getBitcoinUtxos

```
opcat.getBitcoinUtxos(cursor,size)
```

GetBitcoinUTXOS

**Parameters**

**Returns**

- `Promise` - `object`:
  - `txid` - `string`:
  - `vout` - `integer`:

### sendBitcoin

```
opcat.sendBitcoin(toAddress, satoshis, options)
```

Send BTC

**Parameters**

- `toAddress` - `string`: the address to send
- `satoshis` - `number`: the satoshis to send
- `options` - `object`: (optional)
  - `feeRate` - `number`: the network fee rate
  - `memo` - `string`: (optional) The data content of OP_RETURN, which needs to be in UTF-8 or HEX encoded format.
  - `memos` - `string[]`: (optional) The data content of OP_RETURN, which needs to be in UTF-8 or HEX encoded format, provided in the form of an array.

**Returns**

- `Promise` - `string`: txid

**Example**

```javascript
try {
  let txid = await window.opcat.sendBitcoin(
    "tb1qrn7tvhdf6wnh790384ahj56u0xaa0kqgautnnz",
    1000
  );
  console.log(txid);
} catch (e) {
  console.log(e);
}
```


# Manage Networks

Opcat Wallet currently supports the following network types, which can be obtained through opcat.getChain, and switched through the `opcat.switchChain` method.

| name                    | enum                    | uni  | network |
| ----------------------- | ----------------------- | ---- | ------- |
| Opcat Layer Mainnet | OPCAT_LAYER_MAINNET | BTC   | livenet |
| Opcat Layer Testnet | OPCAT_LAYER_TESTNET | tBTC  | livenet |

Please note that the term "network" refers to the Bitcoin address format. For example, in the case of Fractal Bitcoin Testnet, the returned network is livenet.

## Method

### getChain

```
opcat.getChain()
```

get chain

**Parameters**

none

**Returns**

- `Promise` - `Object`:
  - `enum` - `string` : the enum of chain
  - `name` - `string` : the name of chain
  - `network` - `string` : livenet or testnet

**Example**

```javascript
try {
  let res = await window.opcat.getChain();
  console.log(res)
} catch (e) {
  console.log(e);
}

>  {enum: 'BITCOIN_MAINNET', name: 'Bitcoin Mainnet', network: 'livenet'}
```

---

### switchChain

```
opcat.switchChain(chain)
```

switch chain

**Parameters**

- `chain` - `string`: the chain. BITCOIN_MAINNET or BITCOIN_TESTNET or FRACTAL_BITCOIN_MAINNET

**Returns**

- `Promise` - `Object`:
  - `enum` - `string` : the enum of chain
  - `name` - `string` : the name of chain
  - `network` - `string` : livenet or testnet

**Example**

```javascript
try {
    let res = await window.opcat.switchChain("BITCOIN_MAINNET");
    console.log(res)
} catch (e) {
    console.log(e);
}

> {enum: 'BITCOIN_MAINNET', name: 'Bitcoin Mainnet', network: 'livenet'}
```

---

### chainChanged

```javascript
opcat.on('chainChanged', handler: (network: string) => void);

opcat.removeListener('chainChanged', handler: (network: string) => void);
```

The `chainChanged` will be emitted whenever the user's network changes.

### networkChanged (deprecated)

```javascript
opcat.on('networkChanged', handler: (network: string) => void);

opcat.removeListener('networkChanged', handler: (network: string) => void);
```

The `networkChanged` will be emitted whenever the user's network changes.


# Sign Message

### signMessage

```
opcat.signMessage(msg[, type])
```

sign message

**Parameters**

- `msg` - `string`: a string to sign
- `type` - `string`: (Optional) "ecdsa" | "bip322-simple". default is "ecdsa"

**Returns**

- `Promise` - `string`: the signature.

**Example**

```javascript
// sign by ecdsa
try {
    let res = await window.opcat.signMessage("abcdefghijk123456789");
    console.log(res)
} catch (e) {
    console.log(e);
}

> G+LrYa7T5dUMDgQduAErw+i6ebK4GqTXYVWIDM+snYk7Yc6LdPitmaqM6j+iJOeID1CsMXOJFpVopvPiHBdulkE=

```

