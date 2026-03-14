import { permissionService, sessionService } from '@/background/service';
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
    // Validate public key format (compressed: 66 chars, uncompressed: 130 chars)
    const pubKeyHex = params.externalPubKey;
    if (!/^(02|03)[0-9a-fA-F]{64}$/.test(pubKeyHex) && !/^04[0-9a-fA-F]{128}$/.test(pubKeyHex)) {
      throw new Error('Invalid externalPubKey format. Must be compressed (02/03 prefix, 33 bytes) or uncompressed (04 prefix, 65 bytes)');
    }
  }])
  ecdh = async ({ data: { params } }) => {
    return wallet.computeECDH(params.externalPubKey);
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
  @Reflect.metadata('APPROVAL', ['AutoPayment', () => {
    // No validation needed - just show approval popup
  }])
  autoPayment = async ({ session, data: { params } }) => {
    // If we get here, user approved - add to whitelist
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

    if (!params || !params.psbtHex) {
      throw new Error('psbtHex is required');
    }

    // Parse PSBT to get amount and fee rate
    const networkType = wallet.getNetworkType();
    const psbtNetwork = toPsbtNetwork(networkType);
    const psbt = bitcoin.Psbt.fromHex(params.psbtHex, { network: psbtNetwork });

    // Calculate total input value
    let totalInputValue = 0;
    for (let i = 0; i < psbt.data.inputs.length; i++) {
      const input = psbt.data.inputs[i];
      if (input.witnessUtxo) {
        totalInputValue += input.witnessUtxo.value;
      } else if (input.nonWitnessUtxo) {
        const tx = bitcoin.Transaction.fromBuffer(input.nonWitnessUtxo);
        const prevIndex = psbt.txInputs[i].index;
        totalInputValue += tx.outs[prevIndex].value;
      }
    }

    // Calculate total output value
    let totalOutputValue = 0;
    for (const output of psbt.txOutputs) {
      totalOutputValue += output.value;
    }

    // Calculate fee and estimate vsize
    const fee = totalInputValue - totalOutputValue;
    // Estimate vsize (rough estimate: ~68 vbytes per input, ~34 per output for P2WPKH)
    const estimatedVsize = psbt.data.inputs.length * 68 + psbt.txOutputs.length * 34 + 10;
    const feeRate = fee / estimatedVsize;

    // Use total output value as the "amount" for limit checking
    const amount = totalOutputValue;

    // Validate the payment
    const validation = wallet.validateSmallPayment(origin, amount, feeRate);
    if (!validation.valid) {
      throw new Error(validation.error || 'SmallPay validation failed');
    }

    // Get current account
    const account = await wallet.getCurrentAccount();
    if (!account) {
      throw new Error('No current account');
    }

    // Sign the PSBT
    const autoFinalized = params.options?.autoFinalized !== false;
    const toSignInputs = await wallet.formatOptionsToSignInputs(psbt, params.options);
    await wallet.signPsbt(psbt, toSignInputs, autoFinalized);
    const signedPsbtHex = psbt.toHex();

    // Extract transaction and broadcast
    let txid: string;
    try {
      const tx = psbt.extractTransaction(true);
      txid = tx.getId();
      // Broadcast transaction
      await wallet.pushTx(tx.toHex());
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
