// Define los datos mínimos que necesita el flujo de automatización para iniciar sesión en SofiaPlus.
export interface SofiaCredentials {
  username: string;
  password: string;
  startDate: string;
  endDate: string;
  identification: string;
}

// Representa una coordenada de pantalla usada para hacer clic en un elemento detectado por JS dentro del navegador.
export interface ClickPoint {
  x: number;
  y: number;
}
