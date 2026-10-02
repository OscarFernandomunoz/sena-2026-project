import type { BrowserWindow } from 'electron';
import { executeInEveryFrame } from './frames.js';

// Quita de la página todos los punteros (esferas) dibujados por los pasos del flujo.
// Se inyecta el script en todos los frames porque cada modal/iframe tenía su propio
// marcador; hay que limpiar cada uno cuando se abandona ese paso.
export function clearPageMarkersScript(): string {
  return `(() => {
    for (const id of ['__sofiaTargetMarker__', '__sofiaDemoClickMarker__', '__sofiaDemoClickLabel__', '__sofiaDemoPulse__']) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }
    return true;
  })()`;
}

// Ejecuta la limpieza de punteros en todos los frames de la ventana de SofiaPlus.
export async function clearPageMarkers(window: BrowserWindow): Promise<void> {
  await executeInEveryFrame(window, clearPageMarkersScript(), 2);
}
