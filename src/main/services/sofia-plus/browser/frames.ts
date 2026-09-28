import { type BrowserWindow, type WebContents, type WebFrameMain, webContents } from 'electron';
import { wait } from './timing.js';

// Ventanas emergentes (window.open) registradas por ventana principal. Vive aquí, y no en el
// registro de ventanas, para que este módulo no dependa de él:_window-tracker_ necesita
// discoverFrames() para parchear los frames, y sin esta separación los dos se importarían
// mutuamente.
const childWindows = new WeakMap<BrowserWindow, Set<BrowserWindow>>();

// Registra una ventana emergente como destino de inyección de una ventana principal.
export function trackChildWindow(parent: BrowserWindow, child: BrowserWindow): void {
  if (!childWindows.has(parent)) childWindows.set(parent, new Set());
  childWindows.get(parent)?.add(child);
  child.on('closed', () => childWindows.get(parent)?.delete(child));
}

function getTrackedChildWindows(parent: BrowserWindow): ReadonlySet<BrowserWindow> {
  return childWindows.get(parent) ?? new Set<BrowserWindow>();
}

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

// Ejecuta un script en todos los frames y devuelve TODOS los resultados, sin cortar en el
// primero. executeInFrames se queda con el primer valor que satisface el predicado, así que
// para inspeccionar el portal entero servía de poco: el diálogo del instructor vive en un
// iframe distinto del frame principal, y quedarse con el primero mostraba siempre la página
// de inicio en lugar del diálogo.
export async function executeInAllFrames<T>(
  window: BrowserWindow,
  script: string,
): Promise<T[]> {
  const results: T[] = [];
  for (const frame of collectFrames(window)) {
    try {
      results.push(await frame.executeJavaScript(script) as T);
    } catch {
      // El frame puede cambiar durante una redirección o una carga parcial.
    }
  }
  return results;
}

// Inyecta un script en TODOS los frames de la ventana, sin cortar en el primero que responde.
//
// executeInFrames se detiene en el primer frame que satisface el predicado, así que con él solo
// quedaba parcheado el frame principal: el iframe del diálogo de instructor nunca recibía el
// shim de blockUI y su jQuery lanzaba "$.unblockUI is not a function" al terminar cada AJAX de
// JSF. Al abortar ese callback, la tabla de resultados no se renderizaba y el enlace del
// instructor nunca aparecía.
export async function executeInEveryFrame(
  window: BrowserWindow,
  script: string,
  attempts = 3,
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let failures = 0;
    for (const frame of collectFrames(window)) {
      try {
        await frame.executeJavaScript(script);
      } catch {
        failures += 1;
      }
    }
    if (failures === 0) return true;
    if (attempt < attempts - 1) await wait(300);
  }
  return false;
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
