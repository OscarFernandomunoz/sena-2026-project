export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type ThemeListener = (theme: ResolvedTheme) => void;

export const THEME_STORAGE_KEY = 'aia-theme';

export function isTheme(value: string | undefined): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getThemeLabel(theme: Theme): string {
  if (theme === 'system') return 'Sistema';
  return theme === 'dark' ? 'Oscuro' : 'Claro';
}
