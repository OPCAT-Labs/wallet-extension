/**
 * Theme Colors
 * All colors reference CSS variables defined in theme-variables.css
 * This ensures a single source of truth for colors across the application.
 */

export const colors = {
  // Transparent
  transparent: 'transparent',

  // Primary colors
  primary: 'var(--color-primary)',
  primary_dark: 'var(--color-primary-dark)',
  primary_light: 'var(--color-primary-light)',
  primary_lighter: 'var(--color-primary-lighter)',

  // Accent colors
  accent: 'var(--color-accent)',
  accent_muted: 'rgba(var(--color-accent-rgb), 0.2)',

  // Text colors
  text: 'var(--color-text)',
  textDim: 'var(--color-text-dim)',
  textWhite: 'var(--color-text-muted)',
  white: 'var(--color-text)',
  white_muted: 'var(--color-text-dim)',
  white_muted2: 'var(--color-text-muted)',
  white_muted3: 'var(--color-text-strong)',

  // Background colors
  background: 'var(--color-background)',
  black: 'var(--color-background)',
  black_muted: 'rgba(var(--color-background-rgb), 0.5)',
  black_muted2: 'rgba(var(--color-background-rgb), 0.2)',
  black_dark: 'var(--color-card)',
  card: 'var(--color-card)',
  bg2: 'var(--color-bg-secondary)',
  bg3: 'var(--color-bg-tertiary)',
  bg4: 'var(--color-bg-quaternary)',
  search_bar_bg: 'var(--color-card)',

  // Border colors
  border: 'var(--color-border)',
  border2: 'var(--color-border-strong)',
  line: 'var(--color-line)',
  line2: 'var(--color-line-strong)',

  // Status colors - Success / Green
  success: 'var(--color-success)',
  green: 'var(--color-green)',
  green_dark: 'var(--color-green-dark)',
  green_dark2: 'var(--color-green-dark)',
  green_light: 'var(--color-green-light)',

  // Status colors - Error / Red
  error: 'var(--color-error)',
  danger: 'rgba(var(--color-error-rgb), 0.9)',
  red: 'var(--color-red)',
  red_dark: 'var(--color-red-dark)',
  red_light: 'var(--color-red-light)',
  red_light2: 'var(--color-red-light)',

  // Status colors - Warning / Orange
  warning: 'var(--color-warning)',
  warning_content: 'var(--color-warning-content)',
  warning_bg: 'var(--color-warning-bg)',
  orange: 'var(--color-orange)',
  orange_dark: 'var(--color-orange-dark)',
  orange_light: 'var(--color-orange-light)',
  orange_light2: 'var(--color-orange-light)',

  // Special colors
  value_up_color: 'var(--color-value-up)',
  value_down_color: 'var(--color-value-down)',
  ticker_color: 'var(--color-ticker)',
  txid_color: 'var(--color-txid)',
  cat20_color: 'var(--color-cat20)',
  icon_yellow: 'var(--color-icon-accent)',

  // Legacy colors (mapped to new system)
  gold: 'var(--color-primary)',
  yellow: 'var(--color-yellow)',
  yellow_dark: 'var(--color-yellow-dark)',
  yellow_light: 'var(--color-yellow-light)',
  blue: 'var(--color-blue)',
  blue_dark: 'var(--color-blue-dark)',
  blue_light: 'var(--color-blue-light)',
  dark: 'var(--color-dark)',
  grey: 'var(--color-grey)',
  light: 'var(--color-light)',
};

export type ColorTypes = keyof typeof colors;
