import React from 'react';

import { useI18n } from '../hooks/useI18n';

/**
 * Higher-order component for injecting i18n functionality into class components
 * @param WrappedComponent Class component that needs i18n functionality
 * @returns Wrapped component with i18n props
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withI18n = (WrappedComponent: React.ComponentType<any>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function WithI18nComponent(props: any) {
    const i18n = useI18n();

    return <WrappedComponent {...props} i18n={i18n} />;
  };
};
