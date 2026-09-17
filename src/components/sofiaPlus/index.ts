import { BrowserWindow } from 'electron';
import { booleanScript, clickScript, patchSofiaPageGuards, wait, executeInFrames } from './browser.js';
import { fillSofiaInputs } from './login.js';
import {
  findConsolidatedTimeOption,
  findInstructorTimeOption,
  findTimeManagementOption,
  openAspiranteOptions,
  selectCurriculumOption,
} from './navigation.js';
import { fillInstructorIdentification, fillReportDates, findInstructorPicker, findInstructorSearchButton, instructorResultsLoaded, openIdentificationTypeSelect, selectCitizenshipId } from './report.js';
import type { SofiaCredentials } from './types.js';

// Este archivo orquesta el flujo principal de automatización de SofiaPlus.
const SOFIA_URL = 'http://senasofiaplus.edu.co/sofia-public/';
let sofiaWindow: BrowserWindow | null = null;
const TOTAL_STEPS = 11;

export type { SofiaCredentials } from './types.js';

function showStepBanner(window: BrowserWindow, stepNumber: number, stepTitle: string): Promise<void> {
  const script = `
    (() => {
      const id = '__sofiaStepBanner__';
      let banner = document.getElementById(id);
      const root = document.body || document.documentElement;
      if (!banner) {
        banner = document.createElement('div');
        banner.id = id;
        root.appendChild(banner);
      }
      const step = ${stepNumber};
      const total = ${TOTAL_STEPS};
      const title = ${JSON.stringify(stepTitle)};
      const pct = Math.round((step / total) * 100);
      banner.style.position = 'fixed';
      banner.style.top = '12px';
      banner.style.right = '12px';
      banner.style.zIndex = '2147483647';
      banner.style.background = '#11161c';
      banner.style.color = '#fff';
      banner.style.fontFamily = 'Arial, sans-serif';
      banner.style.fontSize = '13px';
      banner.style.fontWeight = '700';
      banner.style.padding = '10px 14px';
      banner.style.borderRadius = '10px';
      banner.style.border = '2px solid #007aff';
      banner.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
      banner.style.minWidth = '230px';
      banner.style.lineHeight = '1.35';
      banner.innerHTML = \`
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="color:#94a3b8;font-weight:600;font-size:11px;">PASO \${step} DE \${total}</span>
          <span style="background:#007aff;color:#fff;padding:2px 8px;border-radius:999px;font-size:11px;">\${pct}%</span>
        </div>
        <div style="margin-bottom:8px;">\${title}</div>
        <div style="background:#1f2937;height:6px;border-radius:999px;overflow:hidden;">
          <div style="background:linear-gradient(90deg,#007aff,#34d399);width:\${pct}%;height:100%;transition:width 0.3s;"></div>
        </div>
      \`;
      return true;
    })();
  `;
  return executeInFrames<boolean>(window, script, Boolean, 5).then(() => {
    console.log(`\n🚩 PASO ${stepNumber}/${TOTAL_STEPS}: ${stepTitle}\n`);
  });
}

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
  await clickScript(window, `(${openIdentificationTypeSelect.toString()})()`, 'No se encontró el campo Tipo de Identificación.', 'inputTipoIdentificacion encontrado:');
  await booleanScript(window, `(${selectCitizenshipId.toString()})()`, 'No se encontró la opción Cédula de ciudadanía.');
  await booleanScript(window, `(${fillInstructorIdentification.toString()})(${JSON.stringify(credentials.identification)})`, 'No se encontró el campo de identificación del instructor.');

  void showStepBanner(window, 10, '🔵 Pulsando botón Consultar del diálogo');
  await clickScript(
    window,
    `(${findInstructorSearchButton.toString()})()`,
    'No se encontró el botón Consultar del instructor.',
  );

  void showStepBanner(window, 11, '✅ Esperando Lista de usuarios SENA');
  await booleanScript(window, `(${instructorResultsLoaded.toString()})()`, 'SofiaPlus no mostró la lista de usuarios después de consultar.');
}
