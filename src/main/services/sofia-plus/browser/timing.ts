// Espera de tiempo entre acciones del flujo de automatización.
export const ACTION_DELAY_MS = 5_000;

// Espera una cantidad fija de milisegundos antes de continuar con la siguiente acción.
export const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});
