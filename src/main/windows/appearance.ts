import { nativeTheme, type BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import { join } from 'node:path';
import {
  APP_TITLE,
  TITLE_BAR_HEIGHT,
  type TitleBarTheme,
} from '../../shared/window.js';
import { TITLE_BAR_OVERLAY_COLORS, TITLE_BAR_THEME_COLORS } from './palette.js';
import { buildRemoteChromeScript } from './remote-chrome.js';

let activeTitleBarTheme: TitleBarTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
const remoteWindows = new WeakSet<BrowserWindow>();

export function getCurrentTitleBarTheme(): TitleBarTheme {
  return activeTitleBarTheme;
}

function isRemoteSofiaWindow(window: BrowserWindow): boolean {
  if (remoteWindows.has(window)) return true;

  try {
    return window.webContents.getURL().toLowerCase().includes('senasofiaplus');
  } catch {
    return false;
  }
}

function getWindowAppearanceOptions(
  initialTheme: TitleBarTheme = getCurrentTitleBarTheme(),
): BrowserWindowConstructorOptions {
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 12 },
    };
  }

  if (process.platform === 'win32' || process.platform === 'linux') {
    return {
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        ...TITLE_BAR_OVERLAY_COLORS[initialTheme],
        height: TITLE_BAR_HEIGHT,
      },
    };
  }

  return { frame: false };
}

export function getAppWindowOptions(
  initialTheme: TitleBarTheme = getCurrentTitleBarTheme(),
): BrowserWindowConstructorOptions {
  return {
    title: APP_TITLE,
    icon: join(process.cwd(), 'public/images/sofia-plus.png'),
    autoHideMenuBar: true,
    backgroundColor: TITLE_BAR_THEME_COLORS[initialTheme].background,
    ...getWindowAppearanceOptions(initialTheme),
  };
}

export function applyTitleBarTheme(window: BrowserWindow, theme: TitleBarTheme): void {
  activeTitleBarTheme = theme;
  if (window.isDestroyed()) return;

  if (process.platform === 'win32' || process.platform === 'linux') {
    try {
      window.setTitleBarOverlay({
        ...TITLE_BAR_OVERLAY_COLORS[theme],
        height: TITLE_BAR_HEIGHT,
      });
    } catch (error) {
      console.warn('[AIA][Window] No se pudo actualizar el overlay nativo de la ventana.', error);
    }
  }

  if (isRemoteSofiaWindow(window)) {
    void window.webContents.executeJavaScript(buildRemoteChromeScript(theme), true).catch(() => {
      // La página puede estar navegándose; se reintentará en dom-ready.
    });
  }
}

export function registerRemoteWindow(window: BrowserWindow): void {
  if (remoteWindows.has(window)) return;
  remoteWindows.add(window);

  const decorate = (): void => {
    if (window.isDestroyed() || window.webContents.isDestroyed()) return;
    void window.webContents.executeJavaScript(
      buildRemoteChromeScript(getCurrentTitleBarTheme()),
      true,
    ).catch(() => {
      // El contenido todavía puede estar cambiando durante una navegación.
    });
  };

  window.webContents.on('dom-ready', decorate);
  window.webContents.on('did-start-navigation', decorate);
  window.webContents.on('did-finish-load', decorate);
  window.webContents.on('did-frame-finish-load', decorate);

  // Algunos portales reescriben el documento después de dom-ready; estos
  // reintentos garantizan que la barra vuelva a quedar visible sin tocar su contenido.
  const retryTimer = setInterval(decorate, 500);
  const stopRetries = (): void => clearInterval(retryTimer);
  setTimeout(stopRetries, 10_000);
  window.once('closed', stopRetries);

  window.webContents.setWindowOpenHandler(() => ({
    action: 'allow',
    overrideBrowserWindowOptions: getAppWindowOptions(getCurrentTitleBarTheme()),
  }));

  decorate();
}
