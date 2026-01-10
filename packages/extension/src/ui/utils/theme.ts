/**
 * Theme utility functions
 * This file should have no React dependencies to avoid circular imports
 */

export type ThemeType = 'light' | 'dark';

export const THEME_NAMES: Record<ThemeType, string> = {
  light: 'Light',
  dark: 'Dark'
};

export function getStoredTheme(): ThemeType {
  const stored = localStorage.getItem('theme');
  return (stored as ThemeType) || 'light';
}

export function applyTheme(theme: ThemeType) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('theme', theme);
}
