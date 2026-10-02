import type { BrowserWindow } from 'electron';
import { executeInEveryFrame } from './frames.js';
import { patchBlockUiScript } from './block-ui-patch.js';
import { patchEsperaGuardarScript } from './espera-guardar-patch.js';
import { patchOpenerShimScript } from './opener-shim-patch.js';

// Aplica los parches de la página en TODOS los frames de la ventana: blockUI, esperaGuardar y
// el shim de window.opener. Volver a hacerlo tras cada carga es lo que permite que un iframe
// nuevo (el diálogo de instructor) quede cubierto antes de que su propio jQuery intente llamar
// $.unblockUI().
//
// esperaGuardar se parchea en la misma pasada porque el portal lo invoca al enviar cada
// consulta JSF y aborta en utiles.js:339 al no existir el elemento "cargando" en el DOM.
// Sin este parche, el paso 10 termina con "Uncaught TypeError: Cannot read properties
// of null (reading 'style')" y la tabla de resultados nunca se renderiza.
//
// El shim de opener se aplica en la misma pasada porque el diálogo de instructor es un iframe y
// un iframe nunca tiene window.opener: sin él, el clic final sobre el instructor revienta en
// sofiaPopUp.js:27 con "Cannot read properties of undefined (reading 'elements')".
export async function patchSofiaPageGuards(window: BrowserWindow): Promise<void> {
  const complete = await executeInEveryFrame(window, patchBlockUiScript(), 3);
  if (!complete) {
    console.warn('[AIA][SofiaPlus] Algún frame no aceptó el parche de blockUI; se reintentará en la siguiente acción.');
  }
  await executeInEveryFrame(window, patchEsperaGuardarScript(), 3);
  await executeInEveryFrame(window, patchOpenerShimScript(), 3);
}
