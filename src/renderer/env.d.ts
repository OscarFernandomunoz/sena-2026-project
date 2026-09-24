import type { TitleBarPlatform } from '../shared/window.js';

// Define la forma del API expuesto desde el preload para que TypeScript reconozca window.electronAPI.
export interface IElectronAPI {
  // Consulta la versión instalada de la app.
  getVersion: () => Promise<string>;

  // Abre SofiaPlus y llena las credenciales y fechas solicitadas.
  openSofiaAndFill: (credentials: {
    username: string;
    password: string;
    startDate: string;
    endDate: string;
    identification: string;
  }) => Promise<void>;

  // Cambia el tema visual de la aplicación.
  setTheme: (theme: 'light' | 'dark') => void;

  // Control de la ventana (TitleBar)
  titleBarPlatform: TitleBarPlatform;
  setTitleBarTheme: (theme: 'light' | 'dark') => void;
  minimize: () => void;
  toggleMaximize: () => void;
  toggleFullScreen: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
}

declare global {
  interface Window {
    // Hace visible el bridge seguro del preload en el renderer.
    electronAPI: IElectronAPI;
  }
}
