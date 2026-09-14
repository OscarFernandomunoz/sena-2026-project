import { BrowserWindow } from 'electron';
import { booleanScript, clickScript, frameClickScript, patchSofiaPageGuards, wait } from './browser.js';
import { fillSofiaInputs } from './login.js';
import {
  findConsolidatedTimeOption,
  findInstructorTimeOption,
  findTimeManagementOption,
  openAspiranteOptions,
  selectCurriculumOption,
} from './navigation.js';
import { clickInstructorSearchButton, fillInstructorIdentification, fillReportDates, findInstructorPicker, instructorResultsLoaded, openIdentificationTypeSelect, selectCitizenshipId } from './report.js';
import type { SofiaCredentials } from './types.js';

// Este archivo orquesta el flujo principal de automatización de SofiaPlus.
const SOFIA_URL = 'http://senasofiaplus.edu.co/sofia-public/';
let sofiaWindow: BrowserWindow | null = null;

export type { SofiaCredentials } from './types.js';

// Crea o reutiliza la ventana de navegador de SofiaPlus y carga la URL base con reintentos.
async function loadWindow(): Promise<BrowserWindow> {
  if (sofiaWindow && !sofiaWindow.isDestroyed()) {
    sofiaWindow.focus();
    return sofiaWindow;
  }
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  sofiaWindow = window;
  window.on('closed', () => { sofiaWindow = null; });
  window.webContents.session.webRequest.onBeforeRequest(
    { urls: ['http://senasofiaplus.edu.co//*'] },
    (details, callback) => {
      const normalizedUrl = details.url.replace(
        'http://senasofiaplus.edu.co//',
        'http://senasofiaplus.edu.co/',
      );
      callback(normalizedUrl === details.url ? {} : { redirectURL: normalizedUrl });
    },
  );
  window.webContents.on('did-frame-finish-load', () => {
    void patchSofiaPageGuards(window);
  });
  let lastLoadError: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await window.loadURL(SOFIA_URL);
      return window;
    } catch (error) {
      lastLoadError = error instanceof Error ? error : new Error(String(error));
      await wait(500 * (attempt + 1));
    }
  }
  window.close();
  throw new Error(`No se pudo cargar SofiaPlus: ${lastLoadError?.message ?? 'error desconocido'}`);
}

// Ejecuta el flujo completo: login, navegación, selección de fechas y preparación del reporte.
export async function openSofiaPlus(credentials: SofiaCredentials): Promise<void> {
  const window = await loadWindow();
  await booleanScript(window, `(${fillSofiaInputs.toString()})(${JSON.stringify(credentials)})`, 'No se encontraron los campos de acceso de SofiaPlus.');
  await clickScript(window, `(${openAspiranteOptions.toString()})()`, 'No se encontró el selector Aspirante después del login.');
  await booleanScript(window, `(${selectCurriculumOption.toString()})()`, 'No cuenta con el rol necesario para acceder a Gestión Desarrollo Curricular.');
  await clickScript(window, `(${findTimeManagementOption.toString()})()`, 'No se encontró la opción Gestión de Tiempos.');
  await clickScript(window, `(${findConsolidatedTimeOption.toString()})()`, 'No se encontró la opción Consultar Consolidado de Tiempos.');
  await clickScript(window, `(${findInstructorTimeOption.toString()})()`, 'No se encontró la opción Consultar Registro de Tiempo de Instructores.');
  await booleanScript(window, `(${fillReportDates.toString()})(${JSON.stringify({ startDate: credentials.startDate, endDate: credentials.endDate })})`, 'No se encontraron los campos de fechas del informe.');
  await booleanScript(window, `(${findInstructorPicker.toString()})()`, 'No se encontró el botón para seleccionar el instructor.');
  await clickScript(window, `(${openIdentificationTypeSelect.toString()})()`, 'No se encontró el campo Tipo de Identificación.', 'inputTipoIdentificacion encontrado:');
  await booleanScript(window, `(${selectCitizenshipId.toString()})()`, 'No se encontró la opción Cédula de ciudadanía.');
  await booleanScript(window, `(${fillInstructorIdentification.toString()})(${JSON.stringify(credentials.identification)})`, 'No se encontró el campo de identificación del instructor.');
  await frameClickScript(
    window,
    `(${clickInstructorSearchButton.toString()})()`,
    'No se encontró el botón Consultar del instructor.',
  );
  await booleanScript(window, `(${instructorResultsLoaded.toString()})()`, 'SofiaPlus no mostró la lista de usuarios después de consultar.');
}
