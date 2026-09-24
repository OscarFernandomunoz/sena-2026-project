import { app, BrowserWindow, ipcMain } from 'electron';
import { openSofiaPlus, type SofiaCredentials } from './sofiaPlus/index.js';
import {
  TITLE_BAR_HEIGHT,
  TITLE_BAR_OVERLAY_COLORS,
} from './windowManager.js';

// Registra los canales IPC que usa la app para comunicarse entre el renderer y el proceso principal.
export function registerIpcHandlers(): void {
  try {
    // Entrega la versión actual de la aplicación al renderer.
    ipcMain.handle('app:get-version', (): string => app.getVersion());

    // Ejecuta el flujo completo de login y manejo de SofiaPlus con las credenciales recibidas.
    ipcMain.handle('sofia:open-and-fill', async (_event, credentials: SofiaCredentials): Promise<void> => {
      await openSofiaPlus(credentials);
    });

    // Mantiene el overlay nativo de Windows/Linux sincronizado con el tema.
    ipcMain.on('window:set-title-bar-theme', (event, theme: unknown) => {
      if (theme !== 'light' && theme !== 'dark') return;
      if (process.platform !== 'win32' && process.platform !== 'linux') return;

      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return;

      try {
        win.setTitleBarOverlay({
          ...TITLE_BAR_OVERLAY_COLORS[theme],
          height: TITLE_BAR_HEIGHT,
        });
      } catch (error) {
        console.warn('No se pudo actualizar el overlay nativo de la barra:', error);
      }
    });

    // Los controles de fallback siempre se dirigen a la ventana que envió el evento.
    ipcMain.on('window:minimize', (event) => {
      BrowserWindow.fromWebContents(event.sender)?.minimize();
    });

    ipcMain.on('window:toggle-maximize', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return;
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    });

    ipcMain.on('window:toggle-full-screen', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return;
      win.setFullScreen(!win.isFullScreen());
    });

    ipcMain.on('window:close', (event) => {
      BrowserWindow.fromWebContents(event.sender)?.close();
    });

    ipcMain.handle('window:is-maximized', (event) => {
      return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
    });
  } catch (error) {
    console.error('Error al registrar handlers IPC:', error);
  }
}
