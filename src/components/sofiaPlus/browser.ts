import { BrowserWindow, webContents, type WebContents, type WebFrameMain } from 'electron';
import type { ClickPoint } from './types.js';

// Este módulo encapsula la ejecución de scripts dentro de la ventana de SofiaPlus.
// Permite detectar elementos, esperar a que carguen y simular clics reales en la interfaz.
const ACTION_DELAY_MS = 5_000;
const DEMO_MODE = true;

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

// Reúne todos los frames sobre los que se puede inyectar el script.
// Además de los frames de la ventana principal, incluye las ventanas emergentes
// (window.open) del propio sitio: el diálogo del instructor puede abrirse en un popup
// y ese popup NO forma parte del árbol de frames de la ventana original.
const childWindows = new WeakMap<BrowserWindow, Set<BrowserWindow>>();

// Registra la ventana de SofiaPlus y las ventanas emergentes que abra (a cualquier nivel)
// para que executeInFrames también pueda inspeccionarlas.
export function trackSofiaWindow(window: BrowserWindow): void {
  if (!childWindows.has(window)) childWindows.set(window, new Set());

  const track = (contents: WebContents): void => {
    contents.on('did-create-window', (child: BrowserWindow) => {
      const children = childWindows.get(window);
      children?.add(child);
      child.on('closed', () => children?.delete(child));
      track(child.webContents);
    });
  };
  track(window.webContents);
}

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
  for (const child of childWindows.get(window) ?? []) {
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

// Dibuja un marcador visual en la ventana indicando dónde se haría clic (modo demostración).
async function showClickMarker(
  window: BrowserWindow,
  point: ClickPoint,
  label: string,
  color = '#ff3b30',
): Promise<void> {
  const script = `
    (() => {
      const markerId = '__sofiaDemoClickMarker__';
      let marker = document.getElementById(markerId);
      const root = document.body || document.documentElement;
      if (!marker) {
        marker = document.createElement('div');
        marker.id = markerId;
        root.appendChild(marker);
      }
      const x = ${point.x};
      const y = ${point.y};
      const size = 24;
      marker.style.position = 'fixed';
      marker.style.left = (x - size / 2) + 'px';
      marker.style.top = (y - size / 2) + 'px';
      marker.style.width = size + 'px';
      marker.style.height = size + 'px';
      marker.style.pointerEvents = 'none';
      marker.style.zIndex = '2147483647';
      marker.style.border = '3px solid ${color}';
      marker.style.borderRadius = '50%';
      marker.style.background = '${color}33';
      marker.style.boxShadow = '0 0 0 4px ${color}55, 0 0 20px ${color}88';
      marker.style.transition = 'all 0.2s ease';
      marker.style.display = 'flex';
      marker.style.alignItems = 'center';
      marker.style.justifyContent = 'center';
      marker.innerHTML = '<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:6px;height:6px;background:${color};border-radius:50%;"></div>';

      const labelId = '__sofiaDemoClickLabel__';
      let labelEl = document.getElementById(labelId);
      if (!labelEl) {
        labelEl = document.createElement('div');
        labelEl.id = labelId;
        root.appendChild(labelEl);
      }
      labelEl.style.position = 'fixed';
      labelEl.style.left = (x + 16) + 'px';
      labelEl.style.top = (y + 16) + 'px';
      labelEl.style.pointerEvents = 'none';
      labelEl.style.zIndex = '2147483647';
      labelEl.style.background = '#11161c';
      labelEl.style.color = '#fff';
      labelEl.style.fontFamily = 'Arial, sans-serif';
      labelEl.style.fontSize = '12px';
      labelEl.style.fontWeight = '700';
      labelEl.style.padding = '6px 10px';
      labelEl.style.borderRadius = '6px';
      labelEl.style.border = '1px solid ${color}';
      labelEl.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
      labelEl.style.whiteSpace = 'pre-line';
      labelEl.style.lineHeight = '1.4';
      labelEl.innerHTML = \`🎯 \${${JSON.stringify(label)}}\\n📍 (\${Math.round(x)}, \${Math.round(y)})\`;

      const pulseId = '__sofiaDemoPulse__';
      let pulse = document.getElementById(pulseId);
      if (!pulse) {
        pulse = document.createElement('div');
        pulse.id = pulseId;
        root.appendChild(pulse);
      }
      pulse.style.position = 'fixed';
      pulse.style.left = (x - size / 2) + 'px';
      pulse.style.top = (y - size / 2) + 'px';
      pulse.style.width = size + 'px';
      pulse.style.height = size + 'px';
      pulse.style.pointerEvents = 'none';
      pulse.style.zIndex = '2147483646';
      pulse.style.border = '2px solid ${color}';
      pulse.style.borderRadius = '50%';
      pulse.style.animation = 'none';
      void pulse.offsetWidth;
      pulse.style.animation = 'sofiaDemoPulseAnim 1.2s ease-out 2';
      if (!document.getElementById('__sofiaDemoStyle__')) {
        const style = document.createElement('style');
        style.id = '__sofiaDemoStyle__';
        style.textContent = \`
          @keyframes sofiaDemoPulseAnim {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(4); opacity: 0; }
          }
        \`;
        root.appendChild(style);
      }

      return true;
    })();
  `;
  try {
    await window.webContents.mainFrame.executeJavaScript(script);
  } catch {
    for (const frame of window.webContents.mainFrame.frames) {
      try { await frame.executeJavaScript(script); } catch { /* ignore */ }
    }
  }
  console.log(`🎯 [DEMO] Click NO ejecutado. Posición marcada: (${point.x.toFixed(1)}, ${point.y.toFixed(1)}) - ${label}`);
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
  if (DEMO_MODE) {
    await showClickMarker(window, point, errorMessage.replace('No se encontró ', ''));
  } else {
    clickAtPoint(window, point);
  }
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
  if (DEMO_MODE) {
    await showClickMarker(window, point, `DOBLE: ${errorMessage.replace('No se encontró ', '')}`, '#007aff');
  } else {
    await doubleClickAtPoint(window, point);
  }
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
  if (DEMO_MODE) {
    await showClickMarker(window, point, `${clickCount} clics: ${errorMessage.replace('No se encontró ', '')}`, '#ff9500');
  } else {
    for (let clickNumber = 1; clickNumber <= clickCount; clickNumber += 1) {
      clickAtPoint(window, point);
      console.log(`Clic ${clickNumber} de ${clickCount} realizado en Consultar.`);
      if (clickNumber < clickCount) await wait(intervalMilliseconds);
    }
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
  if (DEMO_MODE) {
    console.log(`🎯 [DEMO] Clic en iframe NO ejecutado: ${errorMessage.replace('No se encontró ', '')}`);
  } else {
    console.log('Clic único ejecutado dentro del iframe.');
  }
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
