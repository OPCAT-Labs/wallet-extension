import { TxType } from '@/shared/types';
import { Button, Row } from '@/ui/components';
import { TestIds } from '@/ui/utils/test-ids';

const FooterActions = ({ txInfo, type, isValid, t, handleCancel, handleConfirm, setIsPsbtRiskPopoverVisible }) => {
  return (
    <Row full>
      <Button preset="default" text={t('reject')} onClick={handleCancel} testid={TestIds.SEND.REJECT_BUTTON} full />
      <Button
        preset="primary"
        icon={txInfo.decodedPsbt.risks.length > 0 ? 'risk' : undefined}
        text={type === TxType.SIGN_TX ? t('sign') : t('sign_and_pay')}
        testid={TestIds.SEND.SIGN_AND_PAY_BUTTON}
        onClick={() => {
          if (txInfo.decodedPsbt.risks.length > 0) {
            setIsPsbtRiskPopoverVisible(true);
            return;
          }
          handleConfirm && handleConfirm();
        }}
        disabled={!isValid}
        full
      />
    </Row>
  );
};

export default FooterActions;
