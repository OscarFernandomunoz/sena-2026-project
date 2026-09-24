import {
  BrowserWindow,
  nativeTheme,
  type BrowserWindowConstructorOptions,
} from 'electron';
import { join } from 'node:path';

export const TITLE_BAR_HEIGHT = 36;

export const TITLE_BAR_OVERLAY_COLORS = {
  light: { color: '#f3f3f1', symbolColor: '#5f5f5b' },
  dark: { color: '#181818', symbolColor: '#c7c7c4' },
} as const;

type TitleBarTheme = keyof typeof TITLE_BAR_OVERLAY_COLORS;

/**
 * Usa los controles que dibuja el sistema operativo y conserva la barra visual
 * personalizada para el icono, el título y el espacio de arrastre.
 */
function getWindowOptions(initialTheme: TitleBarTheme): BrowserWindowConstructorOptions {
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 12 },
    };
  }

  if (process.platform === 'win32' || process.platform === 'linux') {
    return {
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        ...TITLE_BAR_OVERLAY_COLORS[initialTheme],
        height: TITLE_BAR_HEIGHT,
      },
    };
  }

  // Fallback para plataformas sin controles de ventana nativos.
  return { frame: false };
}

// Crea la ventana principal de la aplicación con el renderer HTML y el preload seguro.
export function createMainWindow(): BrowserWindow {
  const initialTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 720,
    minHeight: 520,
    title: 'AIA - Gestión de Nómina',
    icon: join(process.cwd(), 'public/images/sofia-plus.png'),
    autoHideMenuBar: true,
    backgroundColor: initialTheme === 'dark' ? '#090909' : '#f7f7f5',
    ...getWindowOptions(initialTheme),
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
