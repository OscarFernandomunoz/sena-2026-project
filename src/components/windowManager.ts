import { BrowserWindow } from 'electron';
import { join } from 'node:path';

// Crea la ventana principal de la aplicación con el renderer HTML y el preload seguro.
// Usa frame: false para barra de título personalizada que coincide con el tema de la app.
export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 720,
    minHeight: 520,
    icon: join(process.cwd(), 'public/images/sofia-plus.png'),
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#090909',
    webPreferences: {
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
