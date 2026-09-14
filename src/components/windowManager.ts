import { BrowserWindow } from 'electron';
import { join } from 'node:path';

// Crea la ventana principal de la aplicación con el renderer HTML y el preload seguro.
export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: join(process.cwd(), 'public/images/sofia-plus.png'),
    autoHideMenuBar: true,
    backgroundColor: '#f4f6f8',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#f4f6f8',
      symbolColor: '#17212b',
      height: 32,
    },
    webPreferences: {
      // El preload se usa para exponer una API segura al renderer.
      preload: join(process.cwd(), 'dist/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Carga la interfaz de usuario compilada en la carpeta dist.
  mainWindow.loadFile(join(process.cwd(), 'dist/renderer/index.html'));
  return mainWindow;
}
