import { booleanScript, clickScript, wait } from './browser/index.js';
import { fillSofiaInputs } from './login.js';
import {
  findAmbientesOption,
  findEnvironmentManagementOption,
  findInstructorActivityTimeOption,
  findProgramLookupButton,
  findReportsOption,
  openAspiranteOptions,
  selectCurriculumOption,
} from './navigation.js';
import { clickInstructorResultLink, clickInstructorSearchInput, fillInstructorIdentification, fillReportDates, markIdentificationTypeSelect, selectCitizenshipId, selectLearningResultsOption, submitInstructorTimesReport } from './report/index.js';
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

  void showStepBanner(window, 4, '🏫 Abriendo Gestión de Ambientes');
  await clickScript(window, `(${findEnvironmentManagementOption.toString()})()`, 'No se encontró la opción Gestión de Ambientes.');

  void showStepBanner(window, 5, '📊 Abriendo Gestion Ambientes');
  await clickScript(window, `(${findAmbientesOption.toString()})()`, 'No se encontró la opción Gestion Ambientes.');

  void showStepBanner(window, 6, '📈 Abriendo Reportes');
  await clickScript(window, `(${findReportsOption.toString()})()`, 'No se encontró la opción Reportes.');

  void showStepBanner(window, 7, '👨‍🏫 Abriendo Consulta de Tiempos de Instructor por Actividad de Formación');
  await clickScript(window, `(${findInstructorActivityTimeOption.toString()})()`, 'No se encontró la opción Consulta de Tiempos de Instructor por Actividad de Formación.');

  void showStepBanner(window, 8, '📅 Rellenando fechas del reporte');
  await booleanScript(window, `(${fillReportDates.toString()})(${JSON.stringify({ startDate: credentials.startDate, endDate: credentials.endDate })})`, 'No se encontraron los campos de fechas del informe.');

  void showStepBanner(window, 9, '📥 Selección Actividad de Formación → RESULTADOS DE APRENDIZAJE');
  await booleanScript(window, `(${selectLearningResultsOption.toString()})()`, 'No se encontró la opción RESULTADOS DE APRENDIZAJE de Actividad de Formación.');

  void showStepBanner(window, 10, '📚 Abriendo selector de programa de formación');
  await clickScript(window, `(${findProgramLookupButton.toString()})()`, 'No se encontró el botón de selección de programa de formación.');

  void showStepBanner(window, 11, '🆔 Seleccionando Tipo de Identificación → Cédula de ciudadanía');
  await booleanScript(window, `(${markIdentificationTypeSelect.toString()})()`, 'No se encontró el campo Tipo de Identificación.');
  await wait(600);
  await booleanScript(window, `(${selectCitizenshipId.toString()})()`, 'No se encontró la opción Cédula de ciudadanía.');

  void showStepBanner(window, 12, '🪪 Escribiendo la identificación del instructor');
  await booleanScript(window, `(${fillInstructorIdentification.toString()})(${JSON.stringify(credentials.identification)})`, 'No se encontró el campo de identificación del instructor.');

  void showStepBanner(window, 13, '🔍 Pulsando Consultar');
  await booleanScript(window, `(${clickInstructorSearchInput.toString()})()`, 'No se encontró o no se pudo pulsar el botón Consultar.');

  void showStepBanner(window, 14, '👨‍🏫 Seleccionando el instructor del resultado');
  await booleanScript(window, `(${clickInstructorResultLink.toString()})()`, 'No se encontró el enlace del instructor en los resultados.');

  void showStepBanner(window, 15, '✅ Consultar del reporte');
  await booleanScript(window, `(${submitInstructorTimesReport.toString()})()`, 'No se encontró el botón Consultar del reporte de tiempos.');
}

