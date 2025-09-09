import { BitcoinBalance } from '@/shared/types';

export interface BalanceCardProps {
  /**
   * The account balance
   */
  accountBalance: BitcoinBalance;
  /**
   * Whether to disable the utxo tools
   */
  disableUtxoTools?: boolean;
  /**
   * Whether to enable the refresh button and automatic refresh function
   */
  enableRefresh?: boolean;
}
