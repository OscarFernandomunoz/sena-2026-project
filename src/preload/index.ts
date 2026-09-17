import { contextBridge, ipcRenderer } from 'electron';

// Este API expone una interfaz segura desde el preload hacia el renderer.
// Se limita a invocar canales IPC definidos en el proceso principal sin permitir acceso directo a Node.
export const electronAPI = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),

  openSofiaAndFill: (credentials: {
    username: string;
    password: string;
    startDate: string;
    endDate: string;
    identification: string;
  }): Promise<void> => ipcRenderer.invoke('sofia:open-and-fill', credentials),

  // Control de ventana desde la title bar custom
  minimize: (): void => ipcRenderer.send('window:minimize'),
  toggleMaximize: (): void => ipcRenderer.send('window:toggle-maximize'),
  close: (): void => ipcRenderer.send('window:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
  onMaximizeChange: (callback: (maximized: boolean) => void): () => void => {
    const maximize = (): void => callback(true);
    const unmaximize = (): void => callback(false);
    ipcRenderer.on('window:maximized', maximize);
    ipcRenderer.on('window:unmaximized', unmaximize);
    return () => {
      ipcRenderer.removeListener('window:maximized', maximize);
      ipcRenderer.removeListener('window:unmaximized', unmaximize);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
