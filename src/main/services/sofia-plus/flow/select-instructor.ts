import type { BrowserWindow } from 'electron';
import { booleanScript, clickScript, executeInFrames, markClickPoint, wait } from '../browser/index.js';
import {
  fillInstructorIdentification,
  findInstructorSearchPoint,
  openIdentificationTypeSelect,
  selectCitizenshipId,
} from '../report/index.js';
import { showStepBanner } from './step-banner.js';
import type { ClickPoint, SofiaCredentials } from '../types.js';

// Pasos 9-11 del flujo: se dejan aquí, pausados por petición, mientras se afina
// el paso 8 en modo marcado (solo la esfera, sin clic). Cuando el marcador valide
// la posición del selector, esta función se vuelve a llamar desde index.ts para
// completar la identificación y la selección del instructor.
export async function completeInstructorSelection(
  window: BrowserWindow,
  credentials: SofiaCredentials,
): Promise<void> {
  void showStepBanner(window, 9, '🆔 Tipo de Identificación → Cédula + número');
  await clickScript(window, `(${openIdentificationTypeSelect.toString()})()`, 'No se encontró el campo Tipo de Identificación.', 'Control de tipo de identificación');
  await booleanScript(window, `(${selectCitizenshipId.toString()})()`, 'No se encontró la opción Cédula de ciudadanía.');
  await booleanScript(window, `(${fillInstructorIdentification.toString()})(${JSON.stringify(credentials.identification)})`, 'No se encontró el campo de identificación del instructor.');

  void showStepBanner(window, 10, '🖱️ Marcando el input Consultar (sin hacer clic)');
  const searchPoint = await executeInFrames<ClickPoint | null>(
    window,
    `(${findInstructorSearchPoint.toString()})()`,
    Boolean,
  );
  if (!searchPoint) {
    throw new Error('No se encontró el control Consultar del instructor.');
  }
  // MODO MARCADO: solo se dibuja la esfera donde iría el clic; NO se pulsa el input.
  await markClickPoint(window, searchPoint, 'Input Consultar del instructor');
  await wait(600);

  // ---- Pausar antes del clic real en Consultar ----
  // Al aprobar este marcado se habilita el paso abajo: quitar el comentario.
  /*
  await wait(3000);
  await booleanScript(
    window,
    `(${clickInstructorSearchInput.toString()})()`,
    'No se encontró o no se pudo pulsar el input Consultar del instructor.',
  );

  void showStepBanner(window, 11, '🖱️ Seleccionando instructor en la lista');
  const rowPoint = await executeInFrames<ClickPoint | null>(
    window,
    `(${findInstructorRowSelect.toString()})()`,
    Boolean,
  );
  if (rowPoint) {
    await markClickPoint(window, rowPoint, 'Icono de selección');
    await wait(600);
  }
  await booleanScript(
    window,
    `(${selectInstructorRow.toString()})()`,
    'No se encontró el icono de selección del instructor en la lista.',
  );
  */
}
