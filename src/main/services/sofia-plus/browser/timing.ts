// Espera de tiempo entre acciones del flujo de automatización.
// Antes era 5 s fijos por cada paso; ahora es corto porque executeInFrames ya
// reintenta cada 300 ms hasta que la página (y el elemento) esté lista.
export const ACTION_DELAY_MS = 800;

// Espera una cantidad fija de milisegundos antes de continuar con la siguiente acción.
export const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});
