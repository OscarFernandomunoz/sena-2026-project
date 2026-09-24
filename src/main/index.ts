import { app, BrowserWindow } from 'electron';
import { registerIpcHandlers } from './ipc/handlers.js';
import { registerRemoteWindow } from './windows/appearance.js';
import { createMainWindow } from './windows/manager.js';

app.commandLine.appendSwitch('ignore-certificate-errors');

app.on('browser-window-created', (_event, window) => {
  const registerIfRemote = (): void => {
    if (window.isDestroyed()) return;

    try {
      if (window.webContents.getURL().toLowerCase().includes('senasofiaplus')) {
        registerRemoteWindow(window);
      }
    } catch {
      // La URL todavía puede no estar disponible durante la creación de la ventana.
    }
  };

  window.webContents.on('did-start-navigation', registerIfRemote);
  window.webContents.on('did-finish-load', registerIfRemote);
  registerIfRemote();
});

// El proceso principal inicializa la app, registra los canales IPC y crea la ventana principal.
app.whenReady().then(() => {
  try {
    // Se habilitan los handlers del proceso principal para que el renderer pueda pedir acciones.
    registerIpcHandlers();
    // Se crea la ventana principal de la aplicación al arrancar.
    createMainWindow();

    // En macOS, cuando la app vuelve a activarse, se reabre la ventana si no hay ninguna abierta.
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  } catch (error) {
    console.error('[AIA][Main] No se pudo inicializar la aplicación.', error);
  }
});

// Cuando todas las ventanas se cierran, la aplicación termina, excepto en macOS donde suele quedarse viva.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
