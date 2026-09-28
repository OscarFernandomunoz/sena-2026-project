import type { BrowserWindow } from 'electron';
import type { WebContents } from 'electron';
import { registerRemoteWindow } from '../../../windows/appearance.js';
import { trackChildWindow } from './frames.js';
import { patchSofiaPageGuards } from './page-guards.js';

// Registra la ventana de SofiaPlus y las ventanas emergentes que abra (a cualquier nivel)
// para que el descubrimiento de frames también pueda inspeccionarlas. Además reenvía al
// terminal de la app los console.log que se imprimen DENTRO de la página de SofiaPlus: ahí
// vive toda la depuración de los pasos (botones encontrados, listas de inputs, coordenadas) y
// sin este reenvío esos mensajes nunca se ven en la consola de la aplicación.
const consoleTracked = new WeakSet<WebContents>();

export function trackSofiaWindow(window: BrowserWindow): void {
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

  const track = (target: BrowserWindow): void => {
    const contents = target.webContents;
    forwardConsole(contents);
    // Se aplica sobre TODOS los frames, no solo el principal: el diálogo de instructor vive
    // en un iframe que el sitio crea más tarde y su jQuery necesita el shim de blockUI.
    contents.on('dom-ready', () => {
      void patchSofiaPageGuards(target).catch(() => {
        // El frame todavía puede estar cambiando durante una navegación.
      });
    });
    contents.on('did-frame-finish-load', () => {
      void patchSofiaPageGuards(target).catch(() => {
        // Un subframe puede terminar de cargar mientras el árbol de frames se reconfigura.
      });
    });
    contents.on('did-create-window', (child: BrowserWindow) => {
      trackChildWindow(window, child);
      registerRemoteWindow(child);
      track(child);
    });
  };
  track(window);
}
