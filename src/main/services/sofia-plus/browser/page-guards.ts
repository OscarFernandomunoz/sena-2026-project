import type { BrowserWindow } from 'electron';
import { executeInEveryFrame } from './frames.js';
import { patchBlockUiScript } from './block-ui-patch.js';

// Aplica los parches de la página (blockUI) en TODOS los frames de la ventana. Volver a
// hacerlo tras cada carga es lo que permite que un iframe nuevo (el diálogo de instructor)
// quede cubierto antes de que su propio jQuery intente llamar $.unblockUI().
export async function patchSofiaPageGuards(window: BrowserWindow): Promise<void> {
  const complete = await executeInEveryFrame(window, patchBlockUiScript(), 3);
  if (!complete) {
    console.warn('[AIA][SofiaPlus] Algún frame no aceptó el parche de blockUI; se reintentará en la siguiente acción.');
  }
}
