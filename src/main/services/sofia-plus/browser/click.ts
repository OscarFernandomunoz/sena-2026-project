import type { BrowserWindow } from 'electron';
import { executeInFrames } from './frames.js';
import { patchSofiaPageGuards } from './page-guards.js';
import { ACTION_DELAY_MS, wait } from './timing.js';
import type { ClickPoint } from '../types.js';

const DEMO_MODE = true;

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
