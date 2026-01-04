import React, { CSSProperties } from 'react';

import { spacingGap } from '@/ui/theme/spacing';

import { BaseView, BaseViewProps } from '../BaseView';
import './index.less';

export type RowProps = BaseViewProps & { clickable?: boolean; 'data-testid'?: string };

const $rowStyle = {
  display: 'flex',
  flexDirection: 'row',
  gap: spacingGap.md
} as CSSProperties;

export function Row(props: RowProps) {
  const { clickable, style: $styleOverride, 'data-testid': dataTestid, testid, ...rest } = props;
  const $style = Object.assign({}, $rowStyle, $styleOverride);
  return <BaseView style={$style} testid={dataTestid || testid} {...rest} classname={`row-container ${clickable ? 'clickable' : ''}`} />;
}
