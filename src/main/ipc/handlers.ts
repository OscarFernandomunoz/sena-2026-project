import { BrowserWindow, ipcMain } from 'electron';
import { openSofiaPlus, type SofiaCredentials } from '../services/sofia-plus/index.js';
import { applyTitleBarTheme } from '../windows/appearance.js';

// Registra los canales IPC que usa la app para comunicarse entre el renderer y el proceso principal.
export function registerIpcHandlers(): void {
  try {
    // Ejecuta el flujo completo de login y manejo de SofiaPlus con las credenciales recibidas.
    ipcMain.handle('sofia:open-and-fill', async (_event, credentials: SofiaCredentials): Promise<void> => {
      try {
        await openSofiaPlus(credentials);
      } catch (error) {
        console.error('[AIA][SofiaPlus] No se pudo completar el flujo de automatización.', error);
        throw error;
      }
    });

    // Sincroniza el tema y la barra nativa de todas las ventanas de la app.
    ipcMain.on('window:set-title-bar-theme', (event, theme: unknown) => {
      if (theme !== 'light' && theme !== 'dark') return;
      if (!BrowserWindow.fromWebContents(event.sender)) return;

      for (const window of BrowserWindow.getAllWindows()) {
        applyTitleBarTheme(window, theme);
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

    ipcMain.on('window:close', (event) => {
      BrowserWindow.fromWebContents(event.sender)?.close();
    });

    ipcMain.handle('window:is-maximized', (event) => {
      return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
    });
  } catch (error) {
    console.error('[AIA][IPC] No se pudieron registrar los canales IPC.', error);
  }
}
