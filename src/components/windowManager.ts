import { BrowserWindow } from 'electron';
import { join } from 'node:path';
import { getAppWindowOptions, getCurrentTitleBarTheme } from './windowAppearance.js';

// Crea la ventana principal de la aplicación con el renderer HTML y el preload seguro.
export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 720,
    minHeight: 520,
    ...getAppWindowOptions(getCurrentTitleBarTheme()),
    webPreferences: {
      preload: join(process.cwd(), 'dist/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // También sincroniza el estado cuando el sistema o un atajo maximizan la ventana.
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized');
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:unmaximized');
  });

  // Carga la interfaz de usuario compilada en la carpeta dist.
  mainWindow.loadFile(join(process.cwd(), 'dist/renderer/index.html'));
  return mainWindow;
}
