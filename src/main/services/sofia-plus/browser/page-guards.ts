import type { BrowserWindow } from 'electron';
import { executeInFrames } from './frames.js';
import { patchBlockUiScript } from './block-ui-patch.js';

// Aplica los parches de la página (blockUI) en todos los frames activos de la ventana.
export async function patchSofiaPageGuards(window: BrowserWindow): Promise<void> {
  await executeInFrames(window, patchBlockUiScript(), Boolean, 5);
}
