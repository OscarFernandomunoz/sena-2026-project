import type { TitleBarPlatform } from '../shared/window.js';

// Define la forma del API expuesto desde el preload para que TypeScript reconozca window.electronAPI.
export interface IElectronAPI {
  // Abre SofiaPlus y llena las credenciales y fechas solicitadas.
  openSofiaAndFill: (credentials: {
    username: string;
    password: string;
    startDate: string;
    endDate: string;
    identification: string;
    identifications?: string[];
  }, onProgress?: (identification: string | null, hours: string | null) => void) => Promise<Array<{ identification: string; totalHours: string | null }>>;

  // Aplica las horas al Excel con Excel real, conservando diseño y filtros.
  // Devuelve null si Excel no está disponible (se puede usar el fallback).
  applyHoursToExcel: (payload: { data: ArrayBuffer; fileName: string; cedula: string; hours: string }) => Promise<ArrayBuffer | null>;

  // Control de la ventana (TitleBar)
  titleBarPlatform: TitleBarPlatform;
  setTitleBarTheme: (theme: 'light' | 'dark') => void;
  minimize: () => void;
  toggleMaximize: () => void;
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
