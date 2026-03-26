import { notificationService, permissionService, sessionService } from '@/background/service';
import { CHAINS, CHAINS_MAP, NETWORK_TYPES, VERSION } from '@/shared/constant';
import { NetworkType, RequestMethodSendBitcoinParams, RequestMethodSignMessageParams, RequestMethodSignMessagesParams, RequestMethodSignPsbtParams, RequestMethodSignPsbtsParams } from '@/shared/types';
import { getChainInfo } from '@/shared/utils';
import { amountToSatoshis } from '@/ui/utils';
import { bitcoin } from '@opcat-labs/wallet-sdk/lib/bitcoin-core';
import { verifyMessageOfBIP322Simple } from '@opcat-labs/wallet-sdk/lib/message';
import { toPsbtNetwork } from '@opcat-labs/wallet-sdk/lib/network';
import { ethErrors } from 'eth-rpc-errors';
import BaseController from '../base';
import wallet from '../wallet';

import { psbtFromHex } from '@/background/utils/psbt';
import { formatPsbtHex } from '@/ui/utils/psbt-utils';



class ProviderController extends BaseController {

  requestAccounts = async ({ session: { origin } }) => {
    if (!permissionService.hasPermission(origin)) {
      throw ethErrors.provider.unauthorized();
    }

    const _account = await wallet.getCurrentAccount();
    const account = _account ? [_account.address] : [];
    sessionService.broadcastEvent('accountsChanged', account);
    const connectSite = permissionService.getConnectedSite(origin);
    if (connectSite) {
      const chainType = wallet.getChainType();
      const networkType = wallet.getNetworkType()
      const network = NETWORK_TYPES[networkType].name
      const networkName = CHAINS_MAP[chainType].label
      sessionService.broadcastEvent(
        'networkChanged',
        {
          name: networkName,
          network
        },
        origin
      );
    }
    return account
  };

  disconnect = async ({ session: { origin } }) => {
    wallet.removeConnectedSite(origin)
  };

  /**
   * Request multiple permissions in one approval popup.
   * DApp can request: connect, ecdh, getPKHByPath, smallPay
   */
  @Reflect.metadata('APPROVAL', ['RequestPermissions', (req) => {
    const params = req.data.params;
    if (!params.permissions || !Array.isArray(params.permissions) || params.permissions.length === 0) {
      throw new Error('permissions array is required');
    }
    const validPerms = ['connect', 'ecdh', 'getPKHByPath', 'smallPay'];
    for (const p of params.permissions) {
      if (!validPerms.includes(p)) {
        throw new Error(`Invalid permission: ${p}. Valid: ${validPerms.join(', ')}`);
      }
    }
  }])
  requestPermissions = async ({ data: { params }, session, approvalRes }) => {
    const origin = session.origin;
    const grantedPerms: string[] = approvalRes?.grantedPermissions || params.permissions;

    // Connect or update site with granted permissions
    const chainType = wallet.getChainType();
    permissionService.connectWithPermissions(
      origin,
      session.name,
      session.icon,
      CHAINS_MAP[chainType].enum,
      grantedPerms
    );

    // If smallPay was granted, also add to SmallPay whitelist
    if (grantedPerms.includes('smallPay')) {
      wallet.approveSmallPayOrigin(origin, session.icon);
    }

    // Return which permissions were granted
    const result: Record<string, boolean> = {};
    for (const p of params.permissions) {
      result[p] = grantedPerms.includes(p);
    }
    return result;
  };

  /**
   * Get current permissions for the calling origin (SAFE - no approval needed)
   */
  @Reflect.metadata('SAFE', true)
  getPermissions = async ({ session: { origin } }) => {
    return permissionService.getSitePermissions(origin);
  };

  @Reflect.metadata('SAFE', true)
  getAccounts = async ({ session: { origin } }) => {
    if (!permissionService.hasPermission(origin)) {
      return [];
    }

    const _account = await wallet.getCurrentAccount();
    const account = _account ? [_account.address] : [];
    return account
  };

  @Reflect.metadata('SAFE', true)
  getNetwork = async () => {
    const chainType = wallet.getChainType();
    const networkType = wallet.getNetworkType()
    const network = NETWORK_TYPES[networkType].name
    const networkName = CHAINS_MAP[chainType].label
    return {
      name: networkName,
      network
    }
  };

  @Reflect.metadata('APPROVAL', ['SwitchNetwork', (req) => {
    const network = req.data.params.network;
    if (NETWORK_TYPES[NetworkType.MAINNET].validNames.includes(network)) {
      req.data.params.networkType = NetworkType.MAINNET
    } else if (NETWORK_TYPES[NetworkType.TESTNET].validNames.includes(network)) {
      req.data.params.networkType = NetworkType.TESTNET
    } else {
      throw new Error(`the network is invalid, supported networks: ${NETWORK_TYPES.map(v => v.name).join(',')}`)
    }

    if (req.data.params.networkType === wallet.getNetworkType()) {
      // skip approval
      return true;
    }
  }])
  switchNetwork = async (req) => {
    const { data: { params: { networkType } } } = req;
    wallet.setNetworkType(networkType)
    return this.getNetwork()
  }


  @Reflect.metadata('SAFE', true)
  getChain = async () => {
    const chainType = wallet.getChainType()
    return getChainInfo(chainType)
  };

  @Reflect.metadata('APPROVAL', ['SwitchChain', (req) => {
    const chainType = req.data.params.chain;
    if(!CHAINS_MAP[chainType]){
      throw new Error(`the chain is invalid, supported chains: ${CHAINS.map(v => v.enum).join(',')}`)
    }

    if (chainType == wallet.getChainType()) {
      // skip approval
      return true;
    }
  }])
  switchChain = async (req) => {
    const { data: { params: { chain } } } = req;
    wallet.setChainType(chain)
    return getChainInfo(chain)
  }

  @Reflect.metadata('SAFE', true)
  getPublicKey = async () => {
    const account = await wallet.getCurrentAccount();
    if (!account) return ''
    return account.pubkey;
  };

  @Reflect.metadata('SAFE', true)
  getBalance = async () => {
    const account = await wallet.getCurrentAccount();
    if (!account) return null;
    const balance = await wallet.getAddressBalance(account.address)
    return {
      confirmed: amountToSatoshis(balance.confirm_amount),
      unconfirmed: amountToSatoshis(balance.pending_amount),
      total: amountToSatoshis(balance.amount)
    };
  };

  @Reflect.metadata('SAFE', true)
  verifyMessageOfBIP322Simple = async (req) => {
    const { data: { params } } = req;
    return verifyMessageOfBIP322Simple(params.address, params.message, params.signature, params.network) ? 1 : 0;
  }

  @Reflect.metadata('APPROVAL', ['SignPsbt', (req) => {
    const params:RequestMethodSendBitcoinParams = req.data.params;
    if(!params.sendBitcoinParams.toAddress){
      throw new Error('toAddress is required')
    }
    if(!params.sendBitcoinParams.satoshis){
      throw new Error('satoshis is required')
    }
  }])
  sendBitcoin = async ({ approvalRes: { psbtHex }, ...args }) => {
    console.log('sendBitcoin', args)
    const psbt = psbtFromHex(psbtHex);
    const tx = psbt.extractTransaction(true);
    const rawtx = tx.toHex()
    return await wallet.pushTx(rawtx)
  }

  @Reflect.metadata('APPROVAL', ['SignText', (req) => {
    const params:RequestMethodSignMessageParams = req.data.params;
    if(!params.text){
      throw new Error('text is required')
    }
  }])
  signMessage = async ({ data: { params: { text, type } }, approvalRes }) => {
    if (approvalRes?.signature) {
      return approvalRes.signature
    }
    if (type === 'bip322-simple') {
      return wallet.signBIP322Simple(text)
    } else {
      return wallet.signMessage(text)
    }
  }

  @Reflect.metadata('APPROVAL', ['SignData', () => {
    // todo check text
  }])
  signData = async ({ data: { params: { data, type } } }) => {
    return wallet.signData(data, type)
  }

  @Reflect.metadata('SAFE', true)
  pushTx = async ({ data: { params: { rawtx } } }) => {

    return await wallet.pushTx(rawtx)
  }

  @Reflect.metadata('APPROVAL', ['SignPsbt', (req) => {
    const params:RequestMethodSignPsbtParams = req.data.params;
    if(!params.psbtHex){
      throw new Error('psbtHex is required')
    }

    params.psbtHex = formatPsbtHex(params.psbtHex);
  }])
  signPsbt = async ({ data: { params: { psbtHex, options } }, approvalRes }) => {
    if (approvalRes && approvalRes.signed==true) {
      return approvalRes.psbtHex
    }
    const psbt = psbtFromHex(psbtHex)
    const autoFinalized = (options && options.autoFinalized == false) ? false : true;
    const toSignInputs = await wallet.formatOptionsToSignInputs(psbt, options);
    await wallet.signPsbt(psbt, toSignInputs, autoFinalized);
    return psbt.toHex();
  }

  @Reflect.metadata('APPROVAL', ['MultiSignPsbt', (req) => {
    const params:RequestMethodSignPsbtsParams = req.data.params;
    params.psbtHexs.forEach(psbtHex=>{
      if(!psbtHex){
        throw new Error('psbtHex is required')
      }
    })

    params.psbtHexs = params.psbtHexs.map(psbtHex => formatPsbtHex(psbtHex));
  }])
  multiSignPsbt = async ({ data: { params: { psbtHexs, options } } }) => {
    const account = await wallet.getCurrentAccount();
    if (!account) throw null;
    const networkType = wallet.getNetworkType()
    const psbtNetwork = toPsbtNetwork(networkType)
    const result: string[] = [];
    for (let i = 0; i < psbtHexs.length; i++) {
      const psbt = bitcoin.Psbt.fromHex(psbtHexs[i], { network: psbtNetwork });
      const autoFinalized = (options && options[i] && options[i].autoFinalized == false) ? false : true;
      const toSignInputs = await wallet.formatOptionsToSignInputs(psbtHexs[i], options[i]);
      await wallet.signPsbt(psbt, toSignInputs, autoFinalized);
      result.push(psbt.toHex())
    }
    return result;
  }


  @Reflect.metadata('APPROVAL', ['MultiSignMessage', (req) => {
    const params:RequestMethodSignMessagesParams = req.data.params;
    if(params.messages.length == 0){
      throw new Error('data is required')
    }
    for (let i = 0; i < params.messages.length; i++) {
      const message = params.messages[i];
      if (!message.text) {
        throw new Error('text is required')
      }
      if(message.text.length > 10000){
        throw new Error('text is too long')
      }
    }
  }])
  multiSignMessage = async ({ data: { params: { messages } } }) => {
    const account = await wallet.getCurrentAccount();
    if (!account) throw null;
    const result: string[] = [];
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (message.type === 'bip322-simple') {
        result.push(await wallet.signBIP322Simple(message.text))
      } else {
        result.push(await wallet.signMessage(message.text))
      }
    }
    return result;
  }

  @Reflect.metadata('SAFE', true)
  pushPsbt = async ({ data: { params: { psbtHex } } }) => {
    const hexData = formatPsbtHex(psbtHex);
    const psbt = bitcoin.Psbt.fromHex(hexData);
    const tx = psbt.extractTransaction(true);
    const rawtx = tx.toHex()
    return await wallet.pushTx(rawtx)
  }

  @Reflect.metadata('SAFE', true)
  getVersion = async () => {
    return VERSION
  };

  @Reflect.metadata('SAFE', true)
  getPaymentUtxos = async () => {
    const account = await wallet.getCurrentAccount();
    if (!account) return [];
    const utxos = await wallet.getBTCUtxos()
    return utxos;
  };

  /**
   * ECDH - Elliptic Curve Diffie-Hellman key exchange
   * Requires user approval before computing shared secret
   */
  @Reflect.metadata('APPROVAL', ['ECDH', (req) => {
    const params = req.data.params;
    if (!params.externalPubKey) {
      throw new Error('externalPubKey is required');
    }
    const pubKeyHex = params.externalPubKey;
    if (!/^(02|03)[0-9a-fA-F]{64}$/.test(pubKeyHex) && !/^04[0-9a-fA-F]{128}$/.test(pubKeyHex)) {
      throw new Error('Invalid externalPubKey format. Must be compressed (02/03 prefix, 33 bytes) or uncompressed (04 prefix, 65 bytes)');
    }
    // Skip approval if site already has ecdh permission
    if (permissionService.hasSitePermission(req.session.origin, 'ecdh')) {
      return true; // condition returns true → skip approval
    }
  }])
  ecdh = async ({ data: { params }, session }) => {
    // Grant ecdh permission after first approval
    if (!permissionService.hasSitePermission(session.origin, 'ecdh')) {
      permissionService.grantPermissions(session.origin, ['ecdh']);
    }
    return wallet.computeECDH(params.externalPubKey);
  };

  /**
   * Get PKH (Public Key Hash) derived from a custom BIP32 path
   * Requires user approval
   */
  @Reflect.metadata('APPROVAL', ['GetPKHByPath', (req) => {
    const params = req.data.params;
    if (!params.path || typeof params.path !== 'string') {
      throw new Error('path is required and must be a string');
    }
    if (!/^m(\/\d+'?)+$/.test(params.path)) {
      throw new Error('Invalid BIP32 path format');
    }
    const blocked = ["m/44'", "m/49'", "m/84'", "m/86'"];
    if (blocked.some(p => params.path.startsWith(p))) {
      throw new Error('Standard BIP44/49/84/86 paths are not allowed');
    }
    // Skip approval if site already has getPKHByPath permission
    if (permissionService.hasSitePermission(req.session.origin, 'getPKHByPath')) {
      return true;
    }
  }])
  getPKHByPath = async ({ data: { params }, session }) => {
    // Grant getPKHByPath permission after first approval
    if (!permissionService.hasSitePermission(session.origin, 'getPKHByPath')) {
      permissionService.grantPermissions(session.origin, ['getPKHByPath']);
    }
    return wallet.getPKHByPath(params.path);
  };

  // ========== SmallPay Methods ==========

  /**
   * Get SmallPay status for the current origin (SAFE - no approval needed)
   */
  @Reflect.metadata('SAFE', true)
  smallPayStatus = async ({ session }) => {
    return wallet.getSmallPayStatus(session.origin);
  };

  /**
   * Request SmallPay authorization for the current origin
   * Requires user approval via popup
   */
  @Reflect.metadata('APPROVAL', ['AutoPayment', (req) => {
    // Skip approval if site already has smallPay permission
    if (permissionService.hasSitePermission(req.session.origin, 'smallPay')) {
      return true;
    }
  }])
  autoPayment = async ({ session, data: { params } }) => {
    // Grant smallPay permission and add to whitelist
    if (!permissionService.hasSitePermission(session.origin, 'smallPay')) {
      permissionService.grantPermissions(session.origin, ['smallPay']);
    }
    wallet.approveSmallPayOrigin(session.origin, params?.logo);
    return {
      status: 'approved',
      message: 'SmallPay authorization granted'
    };
  };

  /**
   * Execute a small payment (auto-approved if within limits)
   * Validates: origin whitelist, amount limits, fee rate, 24h rolling limit
   */
  @Reflect.metadata('SAFE', true)
  smallPay = async ({ session, data: { params } }) => {
    const origin = session.origin;

    // If site has smallPay permission but not in SmallPay whitelist, sync it
    if (permissionService.hasSitePermission(origin, 'smallPay') && !wallet.isSmallPayOriginApproved(origin)) {
      wallet.approveSmallPayOrigin(origin, session.icon);
    }

    if (!params || !params.psbtHex) {
      throw new Error('psbtHex is required');
    }

    // Format and parse PSBT (same as signPsbt)
    const psbtHex = formatPsbtHex(params.psbtHex);
    const psbt = psbtFromHex(psbtHex);

    // Get network info for address operations
    const networkType = wallet.getNetworkType();
    const psbtNetwork = toPsbtNetwork(networkType);

    // Get current account address to identify self-transfers
    const account = await wallet.getCurrentAccount();
    if (!account) {
      throw new Error('No current account');
    }
    const walletAddress = account.address;

    // Convert wallet address to output script for comparison
    let walletScript: Buffer;
    try {
      walletScript = bitcoin.address.toOutputScript(walletAddress, psbtNetwork);
    } catch {
      throw new Error('Failed to parse wallet address');
    }

    // Verify wallet address is P2PKH (SmallPay only supports P2PKH wallets)
    const isP2PKHScript = (script: Buffer): boolean => {
      return script.length === 25 && script[0] === 0x76 && script[1] === 0xa9 &&
        script[2] === 0x14 && script[23] === 0x88 && script[24] === 0xac;
    };
    if (!isP2PKHScript(walletScript)) {
      throw new Error('SmallPay only supports P2PKH wallets');
    }

    // Analyze inputs: calculate wallet input value
    // Uses ExtPsbt.getInputOutput() which handles opcat layer's custom UTXO encoding
    let walletInputValue = 0n;
    const walletScriptHex = walletScript.toString('hex');
    for (let i = 0; i < psbt.data.inputs.length; i++) {
      let scriptHex: string | null = null;
      let inputValue: bigint | null = null;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inputOutput = (psbt as any).getInputOutput(i);
        if (inputOutput) {
          scriptHex = Buffer.from(inputOutput.script).toString('hex');
          inputValue = BigInt(inputOutput.value);
        }
      } catch {
        // Fallback to standard PSBT fields
        const input = psbt.data.inputs[i];
        if (input.witnessUtxo) {
          scriptHex = input.witnessUtxo.script.toString('hex');
          inputValue = BigInt(input.witnessUtxo.value);
        } else if (input.nonWitnessUtxo) {
          const tx = bitcoin.Transaction.fromBuffer(input.nonWitnessUtxo);
          const output = tx.outs[psbt.txInputs[i].index];
          scriptHex = output.script.toString('hex');
          inputValue = BigInt(output.value);
        }
      }

      // Match wallet inputs by script (address comparison)
      if (scriptHex && scriptHex === walletScriptHex && inputValue != null) {
        walletInputValue += inputValue;
      }
    }

    if (walletInputValue === 0n) {
      throw new Error('SmallPay: no wallet inputs found in PSBT');
    }

    // Calculate wallet output value (outputs going back to wallet)
    let walletOutputValue = 0n;
    for (const output of psbt.txOutputs) {
      const outputScriptHex = Buffer.from(output.script).toString('hex');
      if (outputScriptHex === walletScriptHex) {
        walletOutputValue += BigInt(output.value);
      }
    }

    // User net cost = wallet inputs - wallet outputs (what the user actually spends)
    const userNetCost = walletInputValue - walletOutputValue;
    if (userNetCost < 0n) {
      throw new Error('Invalid PSBT: wallet outputs exceed wallet inputs');
    }
    // Early reject if amount exceeds single payment limit (also guards BigInt→Number conversion)
    const singlePaymentLimit = wallet.getSmallPaySingleLimit();
    if (userNetCost > BigInt(singlePaymentLimit)) {
      throw new Error(`Amount exceeds single payment limit of ${singlePaymentLimit} sats`);
    }
    const amount = Number(userNetCost);

    // Estimate fee rate using P2PKH input size (148 bytes per input, 34 per output, 10 overhead)
    const toSignInputs = await wallet.formatOptionsToSignInputs(psbt, params.options);
    const walletInputCount = toSignInputs.length;
    const estimatedVsize = walletInputCount * 148 + psbt.txOutputs.length * 34 + 10;
    const feeRate = amount > 0 ? amount / estimatedVsize : 0;

    // Validate the payment
    const validation = wallet.validateSmallPayment(origin, amount, feeRate);
    if (!validation.valid) {
      // Fallback to signPsbt approval popup when SmallPay limits exceeded
      const approvalRes = await notificationService.requestApproval({
        approvalComponent: 'SignPsbt',
        params: {
          method: 'signPsbt',
          data: { psbtHex: params.psbtHex, options: params.options },
          session: { origin: session.origin, name: session.name, icon: session.icon }
        },
        origin: session.origin
      });

      // Sign the PSBT after user approval
      let fallbackSignedHex: string;
      if (approvalRes && approvalRes.signed === true) {
        fallbackSignedHex = approvalRes.psbtHex;
      } else {
        const fallbackPsbt = psbtFromHex(formatPsbtHex(params.psbtHex));
        const fallbackAutoFinalized = params.options?.autoFinalized !== false;
        const fallbackToSignInputs = await wallet.formatOptionsToSignInputs(fallbackPsbt, params.options);
        await wallet.signPsbt(fallbackPsbt, fallbackToSignInputs, fallbackAutoFinalized);
        fallbackSignedHex = fallbackPsbt.toHex();
      }

      // Broadcast the signed transaction (consistent with normal SmallPay flow)
      const fallbackPsbtFinal = psbtFromHex(fallbackSignedHex);
      const fallbackTx = fallbackPsbtFinal.extractTransaction(true);
      const fallbackTxid = fallbackTx.id;
      await wallet.pushTx(fallbackTx.toHex());

      return {
        status: 'success',
        txid: fallbackTxid,
        signedPsbtHex: fallbackSignedHex
      };
    }

    // P2PKH wallet check already done above — safe to sign

    // Sign the PSBT (reuse signPsbt logic)
    const autoFinalized = params.options?.autoFinalized !== false;
    await wallet.signPsbt(psbt, toSignInputs, autoFinalized);
    const signedPsbtHex = psbt.toHex();

    // Extract transaction and broadcast
    let txid: string;
    try {
      const tx = psbt.extractTransaction(true);
      const rawtx = tx.toHex();
      txid = tx.id;
      await wallet.pushTx(rawtx);
    } catch (e) {
      throw new Error(`Failed to broadcast transaction: ${(e as Error).message}`);
    }

    // Record the payment in history
    wallet.recordSmallPayment(origin, amount, txid);

    return {
      status: 'success',
      txid,
      signedPsbtHex
    };
  };
}

export default new ProviderController();
