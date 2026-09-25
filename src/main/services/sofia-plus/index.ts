import { booleanScript, clickScript, executeInFrames } from './browser/index.js';
import { fillSofiaInputs } from './login.js';
import {
  findConsolidatedTimeOption,
  findInstructorTimeOption,
  findTimeManagementOption,
  openAspiranteOptions,
  selectCurriculumOption,
} from './navigation.js';
import { clickInstructorResultLink, clickInstructorSearchInput, fillInstructorIdentification, fillReportDates, findInstructorPicker, openIdentificationTypeSelect, selectCitizenshipId } from './report/index.js';
import type { SofiaCredentials } from './types.js';
import { showStepBanner } from './flow/step-banner.js';
import { loadWindow } from './flow/window-loader.js';

// Este archivo orquesta el flujo principal de automatización de SofiaPlus.
export type { SofiaCredentials } from './types.js';

// Ejecuta el flujo completo: login, navegación, selección de fechas y preparación del reporte.
export async function openSofiaPlus(credentials: SofiaCredentials): Promise<void> {
  const window = await loadWindow();
  void showStepBanner(window, 1, '🔐 Llenando credenciales y haciendo login');
  await booleanScript(window, `(${fillSofiaInputs.toString()})(${JSON.stringify(credentials)})`, 'No se encontraron los campos de acceso de SofiaPlus.');

  void showStepBanner(window, 2, '👤 Seleccionando menú Aspirante');
  await clickScript(window, `(${openAspiranteOptions.toString()})()`, 'No se encontró el selector Aspirante después del login.');

  void showStepBanner(window, 3, '📘 Abriendo Gestión Desarrollo Curricular');
  await booleanScript(window, `(${selectCurriculumOption.toString()})()`, 'No cuenta con el rol necesario para acceder a Gestión Desarrollo Curricular.');

  void showStepBanner(window, 4, '⏰ Abriendo Gestión de Tiempos');
  await clickScript(window, `(${findTimeManagementOption.toString()})()`, 'No se encontró la opción Gestión de Tiempos.');

  void showStepBanner(window, 5, '📊 Abriendo Consultar Consolidado de Tiempos');
  await clickScript(window, `(${findConsolidatedTimeOption.toString()})()`, 'No se encontró la opción Consultar Consolidado de Tiempos.');

  void showStepBanner(window, 6, '👨‍🏫 Abriendo Consultar Registro de Tiempo de Instructores');
  await clickScript(window, `(${findInstructorTimeOption.toString()})()`, 'No se encontró la opción Consultar Registro de Tiempo de Instructores.');

  void showStepBanner(window, 7, '📅 Rellenando fechas del reporte');
  await booleanScript(window, `(${fillReportDates.toString()})(${JSON.stringify({ startDate: credentials.startDate, endDate: credentials.endDate })})`, 'No se encontraron los campos de fechas del informe.');

  void showStepBanner(window, 8, '🔍 Abriendo selector de instructor');
  await booleanScript(window, `(${findInstructorPicker.toString()})()`, 'No se encontró el botón para seleccionar el instructor.');

  void showStepBanner(window, 9, '🆔 Tipo de Identificación → Cédula + número');
  await clickScript(window, `(${openIdentificationTypeSelect.toString()})()`, 'No se encontró el campo Tipo de Identificación.', 'Control de tipo de identificación');
  await booleanScript(window, `(${selectCitizenshipId.toString()})()`, 'No se encontró la opción Cédula de ciudadanía.');
  await booleanScript(window, `(${fillInstructorIdentification.toString()})(${JSON.stringify(credentials.identification)})`, 'No se encontró el campo de identificación del instructor.');

  void showStepBanner(window, 10, '🖱️ Pulsando input Consultar del instructor');
  // El input exacto es input#...:btnSearch.btn.btn-info.btn-block[type="submit"].
  // booleanScript ejecuta la función en el frame que lo contiene; allí se hace un
  // único click DOM, por lo que no se usan las coordenadas globales del iframe.
  await booleanScript(
    window,
    `(${clickInstructorSearchInput.toString()})()`,
    'No se encontró o no se pudo pulsar el input Consultar del instructor.',
  );

  void showStepBanner(window, 11, '🖱️ Pulsando enlace del instructor');
  // La respuesta JSF puede tardar unos segundos en insertar el <a>. Se reintenta durante
  // aproximadamente 18 segundos y se hace un único click en el enlace exacto cuando aparece.
  const resultLinkClicked = await executeInFrames<boolean>(
    window,
    `(${clickInstructorResultLink.toString()})()`,
    Boolean,
    60,
  );
  console.log(
    resultLinkClicked
      ? '[AIA][SofiaPlus] Paso 11 completado: el enlace del instructor fue encontrado y activado correctamente.'
      : '[AIA][SofiaPlus] Paso 11 incompleto: el enlace del instructor no apareció después de agotar los reintentos.',
  );
}
