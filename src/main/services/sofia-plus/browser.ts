import { BrowserWindow, webContents, type WebContents, type WebFrameMain } from 'electron';
import { registerRemoteWindow } from '../../windows/appearance.js';
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
        try {
          if (typeof jq.unblockUI !== 'function') jq.unblockUI = function unblockUI() {};
          if (typeof jq.blockUI !== 'function') jq.blockUI = function blockUI() {};
        } catch {
          // Algunas versiones pueden definir propiedades de jQuery como no editables.
        }
      });
      return candidates.every((jq) => typeof jq.unblockUI === 'function');
    };
    if (!window.__sofiaBlockUiPatch) {
      window.__sofiaBlockUiPatch = true;
      apply();
      window.addEventListener('load', apply, { once: true });
      // SofiaPlus puede recargar jQuery durante una petición JSF; el intervalo vuelve
      // a instalar los métodos si esa recarga reemplaza window.$ o window.jQuery.
      window.setInterval(apply, 50);
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
// para que executeInFrames también pueda inspeccionarlas. Además reenvía al terminal de la
// app los console.log que se imprimen DENTRO de la página de SofiaPlus: ahí vive toda la
// depuración de los pasos (botones encontrados, listas de inputs, coordenadas) y sin este
// reenvío esos mensajes nunca se ven en la consola de la aplicación.
const consoleTracked = new WeakSet<WebContents>();

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
function clickAtPoint(window: BrowserWindow, point: ClickPoint): void {
  window.webContents.sendInputEvent({ type: 'mouseMove', x: point.x, y: point.y });
  window.webContents.sendInputEvent({ type: 'mouseDown', x: point.x, y: point.y, button: 'left' });
  window.webContents.sendInputEvent({ type: 'mouseUp', x: point.x, y: point.y, button: 'left' });
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
  console.log(`[AIA][SofiaPlus] Modo demostración: no se ejecutó el clic; posición marcada (${point.x.toFixed(1)}, ${point.y.toFixed(1)}): ${label}`);
}

// Ejecuta una acción basada en un script que debe devolver una posición y luego hace clic en esa coordenada.
export async function clickScript(
  window: BrowserWindow,
  script: string,
  errorMessage: string,
  targetDescription?: string,
): Promise<void> {
  await wait(ACTION_DELAY_MS);
  await patchSofiaPageGuards(window);
  const point = await executeInFrames<ClickPoint | null>(window, script, Boolean);
  if (targetDescription) {
    console.log(`[AIA][SofiaPlus] ${targetDescription}: ${point ? 'encontrado' : 'no encontrado'}.`);
  }
  if (!point) throw new Error(errorMessage);
  if (DEMO_MODE) {
    await showClickMarker(window, point, errorMessage.replace('No se encontró ', ''));
  } else {
    clickAtPoint(window, point);
  }
}

// Ejecuta un script que debe devolver un valor booleano para confirmar que una acción o elemento existe.
// `attempts` controla cuántas veces se reintenta (cada intento espera ~300 ms entre frames);
// los pasos que dependen de una respuesta AJAX del servidor pueden subirlo.
export async function booleanScript(
  window: BrowserWindow,
  script: string,
  errorMessage: string,
  attempts = 30,
): Promise<void> {
  await wait(ACTION_DELAY_MS);
  await patchSofiaPageGuards(window);
  const result = await executeInFrames<boolean>(window, script, Boolean, attempts);
  if (!result) throw new Error(errorMessage);
}
