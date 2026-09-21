import { app, BrowserWindow } from 'electron';
import { registerIpcHandlers } from '../components/ipcHandlers.js';
import { createMainWindow } from '../components/windowManager.js';

app.commandLine.appendSwitch('ignore-certificate-errors');

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
    console.error('Error al inicializar la aplicación:', error);
  }
});

// Cuando todas las ventanas se cierran, la aplicación termina, excepto en macOS donde suele quedarse viva.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
