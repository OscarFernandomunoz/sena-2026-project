import { app, BrowserWindow, ipcMain } from 'electron';
import { openSofiaPlus, type SofiaCredentials } from './sofiaPlus/index.js';

// Registra los canales IPC que usa la app para comunicarse entre el renderer y el proceso principal.
export function registerIpcHandlers(): void {
  // Entrega la versión actual de la aplicación al renderer.
  ipcMain.handle('app:get-version', (): string => app.getVersion());

  // Ejecuta el flujo completo de login y manejo de SofiaPlus con las credenciales recibidas.
  ipcMain.handle('sofia:open-and-fill', async (_event, credentials: SofiaCredentials): Promise<void> => {
    await openSofiaPlus(credentials);
  });

  // Controla la ventana desde la titlebar custom (frame: false)
  ipcMain.on('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    win?.minimize();
  });

  ipcMain.on('window:toggle-maximize', () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.on('window:close', () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    win?.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    return win?.isMaximized() ?? false;
  });
}
