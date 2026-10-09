import { contextBridge, ipcRenderer } from 'electron';
import { getTitleBarPlatform, type TitleBarTheme } from '../shared/window.js';

// Este API expone una interfaz segura desde el preload hacia el renderer.
// Se limita a invocar canales IPC definidos en el proceso principal sin permitir acceso directo a Node.
export const electronAPI = {
  titleBarPlatform: getTitleBarPlatform(),

  openSofiaAndFill: (credentials: {
    username: string;
    password: string;
    startDate: string;
    endDate: string;
    identification: string;
    identifications?: string[];
  }, onProgress?: (identification: string | null, hours: string | null) => void): Promise<Array<{ identification: string; totalHours: string | null }>> => {
    if (onProgress) {
      const channel = 'sofia:progress';
      const listener = (_event: Electron.IpcRendererEvent, identification: string | null, hours: string | null): void => onProgress(identification, hours);
      ipcRenderer.on(channel, listener);
      return ipcRenderer.invoke('sofia:open-and-fill', credentials).finally(() => {
        ipcRenderer.removeListener(channel, listener);
      });
    }
    return ipcRenderer.invoke('sofia:open-and-fill', credentials);
  },

  // Escribe las horas en el Excel con Excel real (COM), preservando diseño y filtros.
  applyHoursToExcel: (payload: { data: ArrayBuffer; fileName: string; cedula: string; hours: string }): Promise<ArrayBuffer | null> =>
    ipcRenderer.invoke('excel:apply-hours', payload),

  // Sincroniza el color del overlay nativo de Windows/Linux.
  setTitleBarTheme: (theme: TitleBarTheme): void => ipcRenderer.send('window:set-title-bar-theme', theme),

  // Controles propios usados únicamente como fallback.
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
