// API pública de la capa de navegador de SofiaPlus:
// ventanas, parches de página, frames y acciones de clic.
export { patchBlockUiScript } from './block-ui-patch.js';
export { booleanScript, clickScript } from './click.js';
export { executeInAllFrames, executeInEveryFrame, executeInFrames, trackChildWindow } from './frames.js';
export { patchSofiaPageGuards } from './page-guards.js';
export { ACTION_DELAY_MS, wait } from './timing.js';
export { trackSofiaWindow } from './window-tracker.js';
