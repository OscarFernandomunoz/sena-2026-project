import { contextBridge, ipcRenderer } from 'electron';

type TitleBarTheme = 'light' | 'dark';
type TitleBarPlatform = 'darwin' | 'win32' | 'linux' | 'custom';

function getTitleBarPlatform(): TitleBarPlatform {
  if (process.platform === 'darwin' || process.platform === 'win32' || process.platform === 'linux') {
    return process.platform;
  }
  return 'custom';
}

// Este API expone una interfaz segura desde el preload hacia el renderer.
// Se limita a invocar canales IPC definidos en el proceso principal sin permitir acceso directo a Node.
export const electronAPI = {
  titleBarPlatform: getTitleBarPlatform(),

  getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),

  openSofiaAndFill: (credentials: {
    username: string;
    password: string;
    startDate: string;
    endDate: string;
    identification: string;
  }): Promise<void> => ipcRenderer.invoke('sofia:open-and-fill', credentials),

  // Sincroniza el color del overlay nativo de Windows/Linux.
  setTitleBarTheme: (theme: TitleBarTheme): void => ipcRenderer.send('window:set-title-bar-theme', theme),

  // Controles propios usados únicamente como fallback.
  minimize: (): void => ipcRenderer.send('window:minimize'),
  toggleMaximize: (): void => ipcRenderer.send('window:toggle-maximize'),
  toggleFullScreen: (): void => ipcRenderer.send('window:toggle-full-screen'),
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
