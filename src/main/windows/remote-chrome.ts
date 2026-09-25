import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_TITLE, getTitleBarPlatform, TITLE_BAR_HEIGHT, type TitleBarTheme } from '../../shared/window.js';
import { TITLE_BAR_THEME_COLORS } from './palette.js';

// Cromo de la barra de título que se inyecta en las páginas remotas (SofiaPlus) mediante un
// shadow host, de modo que la barra nativa quede visible sin alterar el contenido del portal.

let appIconDataUrl = '';

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

export function buildRemoteChromeScript(theme: TitleBarTheme): string {
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
