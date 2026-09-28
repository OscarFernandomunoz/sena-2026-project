import { BrowserWindow } from 'electron';
import { getAppWindowOptions, getCurrentTitleBarTheme, registerRemoteWindow } from '../../../windows/appearance.js';
import { patchSofiaPageGuards, trackSofiaWindow, wait } from '../browser/index.js';

const SOFIA_URL = 'http://senasofiaplus.edu.co/sofia-public/';
let sofiaWindow: BrowserWindow | null = null;

// Crea o reutiliza la ventana de navegador de SofiaPlus y carga la URL base con reintentos.
export async function loadWindow(): Promise<BrowserWindow> {
  if (sofiaWindow && !sofiaWindow.isDestroyed()) {
    sofiaWindow.focus();
    return sofiaWindow;
  }
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    ...getAppWindowOptions(getCurrentTitleBarTheme()),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  registerRemoteWindow(window);
  sofiaWindow = window;
  window.on('closed', () => { sofiaWindow = null; });
  // Permite que executeInFrames alcance también las ventanas emergentes del sitio
  // (el diálogo del instructor se abre con window.open).
  trackSofiaWindow(window);
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
      const attemptNumber = attempt + 1;
      if (attemptNumber < 3) {
        console.warn(`[AIA][SofiaPlus] No se pudo cargar SofiaPlus en el intento ${attemptNumber}/3; se reintentará.`, error);
        await wait(500 * attemptNumber);
      } else {
        console.error('[AIA][SofiaPlus] No se pudo cargar SofiaPlus después de 3 intentos.', error);
      }
    }
  }
  window.close();
  throw new Error(`No se pudo cargar SofiaPlus: ${lastLoadError?.message ?? 'error desconocido'}`);
}
