import { nativeTheme, type BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  APP_TITLE,
  getTitleBarPlatform,
  TITLE_BAR_HEIGHT,
  type TitleBarTheme,
} from '../../shared/window.js';

const TITLE_BAR_THEME_COLORS = {
  light: { background: '#f7f7f5', text: '#5f5f5b', border: '#f7f7f5' },
  dark: { background: '#181818', text: '#c7c7c4', border: '#181818' },
} as const;

const TITLE_BAR_OVERLAY_COLORS = {
  light: {
    color: TITLE_BAR_THEME_COLORS.light.background,
    symbolColor: TITLE_BAR_THEME_COLORS.light.text,
  },
  dark: {
    color: TITLE_BAR_THEME_COLORS.dark.background,
    symbolColor: TITLE_BAR_THEME_COLORS.dark.text,
  },
} as const;

let activeTitleBarTheme: TitleBarTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
let appIconDataUrl = '';
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

function getAppIconDataUrl(): string {
  if (appIconDataUrl) return appIconDataUrl;

  try {
    const icon = readFileSync(join(process.cwd(), 'public/images/sofia-plus.png'));
    appIconDataUrl = `data:image/png;base64,${icon.toString('base64')}`;
  } catch {
    appIconDataUrl = '';
  }

  return appIconDataUrl;
}

function buildRemoteChromeScript(theme: TitleBarTheme): string {
  const platform = getTitleBarPlatform();
  const isMac = platform === 'darwin';
  const titleLeft = isMac ? '50%' : 'calc(50% - 69px)';
  const titleMaxWidth = isMac ? '180px' : '300px';
  const titleBarColors = TITLE_BAR_THEME_COLORS[theme];
  const titleBarBackground = titleBarColors.background;
  const titleBarText = titleBarColors.text;
  const titleBarBorder = titleBarColors.border;
  const fontFamily = isMac
    ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    : '"Segoe UI Variable Text", "Segoe UI", sans-serif';
  const iconDataUrl = getAppIconDataUrl();
  const iconMarkup = iconDataUrl
    ? `<img class="icon" src="${iconDataUrl}" alt="" aria-hidden="true">`
    : '';
  const shadowCss = `
    :host { display: block; all: initial; }
    .bar {
      position: relative;
      box-sizing: border-box;
      width: 100%;
      height: ${TITLE_BAR_HEIGHT}px;
      overflow: hidden;
      background: ${titleBarBackground};
      border-bottom: 1px solid ${titleBarBorder};
      color: ${titleBarText};
      font-family: ${fontFamily};
      -webkit-app-region: drag;
    }
    .icon {
      position: absolute;
      top: 9px;
      left: 10px;
      display: ${isMac ? 'none' : 'block'};
      width: 18px;
      height: 18px;
      object-fit: contain;
      pointer-events: none;
      -webkit-user-drag: none;
    }
    .title {
      position: absolute;
      top: 50%;
      left: ${titleLeft};
      max-width: calc(100% - ${titleMaxWidth});
      overflow: hidden;
      color: ${titleBarText};
      font-size: 12px;
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
      pointer-events: none;
      transform: translate(-50%, -50%);
    }
  `;
  const markup = `<style>${shadowCss}</style><div class="bar">${iconMarkup}<span class="title">${APP_TITLE}</span></div>`;
  const hostId = '__aia_remote_window_chrome__';
  const pageStyleId = '__aia_remote_window_chrome_style__';

  return `(() => {
    const hostId = ${JSON.stringify(hostId)};
    const pageStyleId = ${JSON.stringify(pageStyleId)};
    let host = document.getElementById(hostId);
    if (!host) {
      host = document.createElement('div');
      host.id = hostId;
      host.attachShadow({ mode: 'open' });
      (document.documentElement || document.body).appendChild(host);
    }
    host.style.cssText = 'position:fixed;top:0;left:0;right:0;height:${TITLE_BAR_HEIGHT}px;z-index:2147483647;pointer-events:auto;';
    host.style.setProperty('-webkit-app-region', 'drag');
    const shadow = host.shadowRoot;
    if (shadow) shadow.innerHTML = ${JSON.stringify(markup)};

    let pageStyle = document.getElementById(pageStyleId);
    if (!pageStyle) {
      pageStyle = document.createElement('style');
      pageStyle.id = pageStyleId;
      (document.head || document.documentElement).appendChild(pageStyle);
    }
    pageStyle.textContent = 'html { padding-top: ${TITLE_BAR_HEIGHT}px !important; box-sizing: border-box !important; } body { margin-top: 0 !important; }';
    return true;
  })()`;
}
