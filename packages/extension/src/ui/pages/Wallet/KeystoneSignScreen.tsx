import { useCallback } from 'react';
import { KeystoneSignEnum } from '@/shared/constant/KeystoneSignType';
import KeystoneSignBase, { KeystoneSignBaseProps } from '@/ui/components/Keystone/SignBase';
import { useWallet } from '@/ui/utils';

interface Props {
  type: KeystoneSignEnum;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  isFinalize?: boolean;
  signatureText?: string;
  id?: number;
  onSuccess?: (data: { psbtHex?: string; rawtx?: string; signature?: string }) => void;
  onBack: () => void;
}

export default function KeystoneSignScreen(props: Props) {
  const wallet = useWallet();

  const generateUR = useCallback(async () => {
    switch (props.type) {
      case KeystoneSignEnum.BIP322_SIMPLE:
        return wallet.genSignMsgUr(props.data, props.type);
      case KeystoneSignEnum.MSG:
        return wallet.genSignMsgUr(props.data, props.type);
      case KeystoneSignEnum.PSBT:
        return wallet.genSignPsbtUr(props.data);
      default:
        return {
          type: '',
          cbor: ''
        };
    }
  }, [props.data, props.type, wallet]);

  const parseUR = useCallback(
    async (type: string, cbor: string) => {
      switch (props.type) {
        case KeystoneSignEnum.BIP322_SIMPLE:
          return wallet.parseSignMsgUr(type, cbor, props.type);
        case KeystoneSignEnum.MSG:
          return wallet.parseSignMsgUr(type, cbor, props.type);
        case KeystoneSignEnum.PSBT:
          return wallet.parseSignPsbtUr(type, cbor, props.isFinalize === false ? false : true);
        default:
          return {
            signature: ''
          };
      }
    },
    [props.isFinalize, props.type, wallet]
  );

  const baseProps: KeystoneSignBaseProps = {
    onBack: props.onBack,
    onSuccess: props.onSuccess,
    signatureText: props.signatureText,
    id: props.id,
    generateUR,
    parseUR
  };

  return <KeystoneSignBase {...baseProps} />;
}
