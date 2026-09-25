import type { BrowserWindow } from 'electron';
import type { WebContents } from 'electron';
import { registerRemoteWindow } from '../../../windows/appearance.js';
import { patchBlockUiScript } from './block-ui-patch.js';

// Registra la ventana de SofiaPlus y las ventanas emergentes que abra (a cualquier nivel)
// para que executeInFrames también pueda inspeccionarlas. Además reenvía al terminal de la
// app los console.log que se imprimen DENTRO de la página de SofiaPlus: ahí vive toda la
// depuración de los pasos (botones encontrados, listas de inputs, coordenadas) y sin este
// reenvío esos mensajes nunca se ven en la consola de la aplicación.
const childWindows = new WeakMap<BrowserWindow, Set<BrowserWindow>>();
const consoleTracked = new WeakSet<WebContents>();

// Devuelve las ventanas emergentes registradas para una ventana principal de SofiaPlus.
export function getTrackedChildWindows(window: BrowserWindow): ReadonlySet<BrowserWindow> {
  return childWindows.get(window) ?? new Set<BrowserWindow>();
}

export function trackSofiaWindow(window: BrowserWindow): void {
  if (!childWindows.has(window)) childWindows.set(window, new Set());

  const forwardConsole = (contents: WebContents): void => {
    if (consoleTracked.has(contents)) return;
    consoleTracked.add(contents);
    contents.on('console-message', (details) => {
      const message = details.message
        ?.replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/\uFE0F/g, '')
        .trim();
      if (!message) return;

      const level = details.level === 'error'
        ? 'ERROR'
        : details.level === 'warning'
          ? 'WARN'
          : details.level === 'debug'
            ? 'DEBUG'
            : 'INFO';
      const formattedMessage = `[AIA][SofiaPlus][${level}] ${message}`;

      if (level === 'ERROR') {
        console.error(formattedMessage);
      } else if (level === 'WARN') {
        console.warn(formattedMessage);
      } else {
        console.log(formattedMessage);
      }
    });
  };

  const track = (contents: WebContents): void => {
    forwardConsole(contents);
    // Se aplica en cuanto el DOM está disponible, sin bloquear ni interferir con loadURL.
    contents.on('dom-ready', () => {
      void contents.executeJavaScript(patchBlockUiScript()).catch(() => {
        // El frame todavía puede estar cambiando durante una navegación.
      });
    });
    contents.on('did-create-window', (child: BrowserWindow) => {
      const children = childWindows.get(window);
      children?.add(child);
      child.on('closed', () => children?.delete(child));
      registerRemoteWindow(child);
      track(child.webContents);
    });
  };
  track(window.webContents);
}
