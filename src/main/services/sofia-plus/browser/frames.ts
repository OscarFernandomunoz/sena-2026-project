import { type BrowserWindow, type WebContents, type WebFrameMain, webContents } from 'electron';
import { getTrackedChildWindows } from './window-tracker.js';
import { wait } from './timing.js';

// Reúne todos los frames sobre los que se puede inyectar el script.
// Además de los frames de la ventana principal, incluye las ventanas emergentes
// (window.open) del propio sitio: el diálogo del instructor puede abrirse en un popup
// y ese popup NO forma parte del árbol de frames de la ventana original.
function collectFrames(window: BrowserWindow): WebFrameMain[] {
  const frames: WebFrameMain[] = [];
  const visited = new Set<number>();

  const visitFrame = (frame: WebFrameMain): void => {
    frames.push(frame);
    for (const child of frame.frames) visitFrame(child);
  };

  const visitContents = (contents: WebContents): void => {
    if (visited.has(contents.id) || contents.isDestroyed()) return;
    visited.add(contents.id);
    try {
      visitFrame(contents.mainFrame);
    } catch {
      // El webContents puede estar cambiando de página justo en este instante.
    }
  };

  visitContents(window.webContents);

  // Ventanas emergentes creadas por esta ventana (diálogo de instructor, etc.).
  for (const child of getTrackedChildWindows(window)) {
    if (child.isDestroyed()) continue;
    visitContents(child.webContents);
  }

  // Cualquier otra página de SofiaPlus abierta por la app (la principal usa file://
  // y DevTools quedan fuera).
  for (const contents of webContents.getAllWebContents()) {
    if (visited.has(contents.id) || contents.isDestroyed()) continue;
    let url: string;
    try {
      url = contents.getURL();
    } catch {
      continue;
    }
    if (url.includes('senasofiaplus')) visitContents(contents);
  }

  return frames;
}

// Ejecuta un fragmento de JavaScript en todos los frames activos de la ventana hasta que la condición sea verdadera.
export async function executeInFrames<T>(
  window: BrowserWindow,
  script: string,
  predicate: (value: T) => boolean,
  attempts = 30,
): Promise<T | undefined> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const frames = collectFrames(window);
    for (const frame of frames) {
      try {
        const result = await frame.executeJavaScript(script) as T;
        if (predicate(result)) return result;
      } catch {
        // El frame puede cambiar durante una redirección o una carga parcial.
      }
    }
    await wait(300);
  }
  return undefined;
}
