import { t } from '@/shared/modules/i18n';
import { RestoreWalletType } from '@/shared/types';
import { Button, Card, Column, Grid, Input, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { FooterButtonContainer } from '@/ui/components/FooterButtonContainer';
import { useI18n } from '@/ui/hooks/useI18n';
import {
  ContextData,
  TabType,
  UpdateContextDataParams,
  WordsType
} from '@/ui/pages/Account/createHDWalletComponents/types';
import { Radio } from 'antd';
import * as bip39 from 'bip39';
import React, { useEffect, useMemo, useState } from 'react';

const getWords12Item = () => ({
  key: WordsType.WORDS_12,
  label: t('12_words'),
  count: 12
});

const getWords24Item = () => ({
  key: WordsType.WORDS_24,
  label: t('24_words'),
  count: 24
});

export function Step1_Import({
  contextData,
  updateContextData
}: {
  contextData: ContextData;
  updateContextData: (params: UpdateContextDataParams) => void;
}) {
  const [curInputIndex, setCurInputIndex] = useState(0);
  const [disabled, setDisabled] = useState(true);
  const { t } = useI18n();

  const wordsItems = useMemo(() => {
    if (contextData.restoreWalletType === RestoreWalletType.XVERSE) {
      return [getWords12Item()];
    } else {
      return [getWords12Item(), getWords24Item()];
    }
  }, [contextData]);

  const [keys, setKeys] = useState<Array<string>>(new Array(wordsItems[contextData.wordsType].count).fill(''));

  const handleEventPaste = (event, index: number) => {
    const copyText = event.clipboardData?.getData('text/plain');
    const textArr = copyText.trim().split(' ');
    const newKeys = [...keys];
    if (textArr) {
      for (let i = 0; i < keys.length - index; i++) {
        if (textArr.length == i) {
          break;
        }
        newKeys[index + i] = textArr[i];
      }
      setKeys(newKeys);
    }

    event.preventDefault();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onChange = (e: any, index: any) => {
    const newKeys = [...keys];
    newKeys.splice(index, 1, e.target.value);
    setKeys(newKeys);
  };

  useEffect(() => {
    setDisabled(true);

    const hasEmpty =
      keys.filter((key) => {
        return key == '';
      }).length > 0;
    if (hasEmpty) {
      return;
    }

    const mnemonic = keys.join(' ');
    if (!bip39.validateMnemonic(mnemonic)) {
      return;
    }

    setDisabled(false);
  }, [keys]);

  const tools = useTools();
  const onNext = async () => {
    try {
      const mnemonics = keys.join(' ');
      updateContextData({ mnemonics, tabType: TabType.STEP3 });
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools.toastError((e as any).message);
    }
  };
  const handleOnKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!disabled && 'Enter' == e.key) {
      onNext();
    }
  };

  return (
    <Column gap="lg">
      <Text text={t('secret_recovery_phrase')} preset="title-bold" textCenter />
      <Text text={t('import_an_existing_wallet_with_your_secret_recover')} preset="sub" textCenter />

      {wordsItems.length > 1 ? (
        <Row justifyCenter>
          <Radio.Group
            onChange={(e) => {
              const wordsType = e.target.value;
              updateContextData({ wordsType });
              setKeys(new Array(wordsItems[wordsType].count).fill(''));
            }}
            value={contextData.wordsType}>
            {wordsItems.map((v) => (
              <Radio key={v.key} value={v.key}>
                {v.label}
              </Radio>
            ))}
          </Radio.Group>
        </Row>
      ) : null}

      <Row justifyCenter>
        <Grid columns={2}>
          {keys.map((_, index) => {
            return (
              <Row key={index}>
                <Card gap="zero">
                  <Text text={`${index + 1}. `} style={{ width: 25 }} textEnd color="textDim" />
                  <Input
                    containerStyle={{ width: 80, minHeight: 25, height: 25, padding: 0 }}
                    style={{ width: 60 }}
                    value={_}
                    onPaste={(e) => {
                      handleEventPaste(e, index);
                    }}
                    onChange={(e) => {
                      onChange(e, index);
                    }}
                    // onMouseOverCapture={(e) => {
                    //   setHover(index);
                    // }}
                    // onMouseLeave={(e) => {
                    //   setHover(999);
                    // }}
                    onFocus={() => {
                      setCurInputIndex(index);
                    }}
                    onBlur={() => {
                      setCurInputIndex(999);
                    }}
                    onKeyUp={(e) => handleOnKeyUp(e as React.KeyboardEvent<HTMLInputElement>)}
                    autoFocus={index == curInputIndex}
                    preset={'password'}
                    placeholder=""
                  />
                </Card>
              </Row>
            );
          })}
        </Grid>
      </Row>

      <FooterButtonContainer>
        <Button
          disabled={disabled}
          text={t('continue')}
          preset="primary"
          onClick={() => {
            onNext();
          }}
        />
      </FooterButtonContainer>
    </Column>
  );
}
