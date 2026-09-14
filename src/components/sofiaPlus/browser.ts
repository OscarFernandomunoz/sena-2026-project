import { BrowserWindow, type WebFrameMain } from 'electron';
import type { ClickPoint } from './types.js';

// Este módulo encapsula la ejecución de scripts dentro de la ventana de SofiaPlus.
// Permite detectar elementos, esperar a que carguen y simular clics reales en la interfaz.
const ACTION_DELAY_MS = 5_000;

// Espera una cantidad fija de milisegundos antes de continuar con la siguiente acción.
export const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

// Evita el error de SofiaPlus cuando llama $.unblockUI sin tener el plugin blockUI cargado.
function patchBlockUiScript(): string {
  return `(() => {
    const apply = () => {
      const candidates = [window.jQuery, window.$].filter(Boolean);
      if (!candidates.length) return false;
      candidates.forEach((jq) => {
        if (typeof jq.unblockUI !== 'function') jq.unblockUI = function unblockUI() {};
        if (typeof jq.blockUI !== 'function') jq.blockUI = function blockUI() {};
      });
      return candidates.every((jq) => typeof jq.unblockUI === 'function');
    };
    if (!window.__sofiaBlockUiPatch) {
      window.__sofiaBlockUiPatch = true;
      apply();
      window.setInterval(apply, 250);
    }
    return apply();
  })()`;
}

export async function patchSofiaPageGuards(window: BrowserWindow): Promise<void> {
  await executeInFrames(window, patchBlockUiScript(), Boolean, 5);
}

// Ejecuta un fragmento de JavaScript en todos los frames activos de la ventana hasta que la condición sea verdadera.
export async function executeInFrames<T>(
  window: BrowserWindow,
  script: string,
  predicate: (value: T) => boolean,
  attempts = 30,
): Promise<T | undefined> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const frames: WebFrameMain[] = [];
    const visit = (frame: WebFrameMain): void => {
      frames.push(frame);
      for (const child of frame.frames) visit(child);
    };
    visit(window.webContents.mainFrame);
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

// Simula un movimiento y clic del mouse en la posición detectada en la pantalla del navegador.
export function clickAtPoint(window: BrowserWindow, point: ClickPoint): void {
  window.webContents.sendInputEvent({ type: 'mouseMove', x: point.x, y: point.y });
  window.webContents.sendInputEvent({ type: 'mouseDown', x: point.x, y: point.y, button: 'left' });
  window.webContents.sendInputEvent({ type: 'mouseUp', x: point.x, y: point.y, button: 'left' });
}

export async function doubleClickAtPoint(window: BrowserWindow, point: ClickPoint): Promise<void> {
  clickAtPoint(window, point);
  await wait(120);
  clickAtPoint(window, point);
}

// Ejecuta una acción basada en un script que debe devolver una posición y luego hace clic en esa coordenada.
export async function clickScript(
  window: BrowserWindow,
  script: string,
  errorMessage: string,
  foundLog?: string,
): Promise<void> {
  await wait(ACTION_DELAY_MS);
  await patchSofiaPageGuards(window);
  const point = await executeInFrames<ClickPoint | null>(window, script, Boolean);
  if (foundLog) console.log(foundLog, Boolean(point));
  if (!point) throw new Error(errorMessage);
  clickAtPoint(window, point);
}

export async function doubleClickScript(
  window: BrowserWindow,
  script: string,
  errorMessage: string,
): Promise<void> {
  await wait(ACTION_DELAY_MS);
  await patchSofiaPageGuards(window);
  const point = await executeInFrames<ClickPoint | null>(window, script, Boolean);
  if (!point) throw new Error(errorMessage);
  await doubleClickAtPoint(window, point);
}

export async function repeatedClickScript(
  window: BrowserWindow,
  script: string,
  errorMessage: string,
  clickCount: number,
  intervalMilliseconds: number,
): Promise<void> {
  await wait(ACTION_DELAY_MS);
  await patchSofiaPageGuards(window);
  const point = await executeInFrames<ClickPoint | null>(window, script, Boolean);
  if (!point) throw new Error(errorMessage);
  for (let clickNumber = 1; clickNumber <= clickCount; clickNumber += 1) {
    clickAtPoint(window, point);
    console.log(`Clic ${clickNumber} de ${clickCount} realizado en Consultar.`);
    if (clickNumber < clickCount) await wait(intervalMilliseconds);
  }
}

export async function frameClickScript(
  window: BrowserWindow,
  script: string,
  errorMessage: string,
): Promise<void> {
  await wait(ACTION_DELAY_MS);
  await patchSofiaPageGuards(window);
  const clicked = await executeInFrames<boolean>(window, script, Boolean);
  if (!clicked) throw new Error(errorMessage);
  console.log('Clic único ejecutado dentro del iframe.');
}

// Ejecuta un script que debe devolver un valor booleano para confirmar que una acción o elemento existe.
export async function booleanScript(
  window: BrowserWindow,
  script: string,
  errorMessage: string,
): Promise<void> {
  await wait(ACTION_DELAY_MS);
  await patchSofiaPageGuards(window);
  const result = await executeInFrames<boolean>(window, script, Boolean);
  if (!result) throw new Error(errorMessage);
}
