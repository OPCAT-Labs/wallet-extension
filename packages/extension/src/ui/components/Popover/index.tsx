import React from 'react';

import { CloseOutlined } from '@ant-design/icons';

import { Row } from '../Row';

export const Popover = ({
  children,
  onClose,
  contentStyle = {},
  testid
}: {
  children: React.ReactNode;
  onClose?: () => void;
  contentStyle?: React.CSSProperties;
  testid?: string;
}) => {
  return (
    <div
      className="popover-container"
      data-testid={testid}
      style={{
        backgroundColor: 'rgba(var(--color-background-rgb),0.8)'
      }}>
      <div
        style={{
          backgroundColor: 'var(--color-card)',
          width: 340,
          padding: 20,
          borderRadius: 15,
          position: 'relative',
          ...contentStyle
        }}>
        {onClose && (
          <Row
            style={{ position: 'absolute', top: 20, right: 20 }}
            justifyEnd
            onClick={() => {
              onClose();
            }}>
            <CloseOutlined />
          </Row>
        )}

        {children}
      </div>
    </div>
  );
};
