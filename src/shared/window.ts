export const APP_TITLE = 'AIA - Gestión de Nómina';
export const TITLE_BAR_HEIGHT = 36;

export type TitleBarTheme = 'light' | 'dark';
export type TitleBarPlatform = 'darwin' | 'win32' | 'linux' | 'custom';

export function getTitleBarPlatform(): TitleBarPlatform {
  if (process.platform === 'darwin' || process.platform === 'win32' || process.platform === 'linux') {
    return process.platform;
  }
  return 'custom';
}
