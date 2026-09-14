import { contextBridge, ipcRenderer } from 'electron';

// Este API expone una interfaz segura desde el preload hacia el renderer.
// Se limita a invocar canales IPC definidos en el proceso principal sin permitir acceso directo a Node.
export const electronAPI = {
  // Obtiene la versión de la aplicación del proceso principal.
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),

  // Abre SofiaPlus y ejecuta el llenado automatizado con las credenciales y fechas indicadas.
  openSofiaAndFill: (credentials: {
    username: string;
    password: string;
    startDate: string;
    endDate: string;
    identification: string;
  }): Promise<void> => ipcRenderer.invoke('sofia:open-and-fill', credentials),

  // Envía el tema seleccionado para que el proceso principal actualice la barra de título.
  setTheme: (theme: 'light' | 'dark'): void => {
    ipcRenderer.send('app:set-theme', theme);
  },
};

// Expose the safe API under the global window.electronAPI object for the renderer process.
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
