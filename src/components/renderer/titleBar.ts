// Maneja la funcionalidad de la barra de título personalizada
export function initTitleBar(): void {
  const minimizeButton = document.getElementById('minimizeButton') as HTMLButtonElement;
  const maximizeButton = document.getElementById('maximizeButton') as HTMLButtonElement;
  const closeButton = document.getElementById('closeButton') as HTMLButtonElement;

  if (!minimizeButton || !maximizeButton || !closeButton) {
    console.error('Title bar buttons not found');
    return;
  }

  // Verificar que la API de Electron esté disponible
  if (typeof window.electronAPI === 'undefined') {
    console.error('Electron API not available');
    return;
  }

  // Minimizar ventana
  minimizeButton.addEventListener('click', () => {
    window.electronAPI.minimize();
  });

  // Maximizar/Restaurar ventana
  maximizeButton.addEventListener('click', () => {
    window.electronAPI.toggleMaximize();
  });

  // Cerrar ventana
  closeButton.addEventListener('click', () => {
    window.electronAPI.close();
  });

  // Actualizar icono de maximizar cuando cambia el estado
  const updateMaximizeIcon = async (): Promise<void> => {
    const isMaximized = await window.electronAPI.isMaximized();
    if (isMaximized) {
      maximizeButton.innerHTML = `
        <svg viewBox="0 0 10 10" width="10" height="10">
          <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
          <rect x="0" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
        </svg>
      `;
    } else {
      maximizeButton.innerHTML = `
        <svg viewBox="0 0 10 10" width="10" height="10">
          <rect width="10" height="10" fill="none" stroke="currentColor" stroke-width="1"/>
        </svg>
      `;
    }
  };

  // Escuchar cambios de estado de maximización
  window.electronAPI.onMaximizeChange(updateMaximizeIcon);

  // Inicializar el icono
  void updateMaximizeIcon();
}