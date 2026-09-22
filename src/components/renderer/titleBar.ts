// Maneja la funcionalidad de la barra de título personalizada
export function initTitleBar(): void {
  const minimizeButton = document.getElementById('minimizeButton') as HTMLButtonElement;
  const maximizeButton = document.getElementById('maximizeButton') as HTMLButtonElement;
  const closeButton = document.getElementById('closeButton') as HTMLButtonElement;

  console.log('🔍 [TitleBar] Verificando botones en el DOM...', {
    minimizeButton,
    maximizeButton,
    closeButton
  });

  if (!minimizeButton || !maximizeButton || !closeButton) {
    console.error('❌ [TitleBar] Error: No se encontraron los botones en el DOM');
    return;
  }

  // Verificar que la API de Electron esté disponible
  if (typeof window.electronAPI === 'undefined') {
    console.error('❌ [TitleBar] Error: window.electronAPI es undefined (revisa el preload script)');
    return;
  }

  console.log('✅ [TitleBar] Botones y API de Electron detectados correctamente');

  // Minimizar ventana
  minimizeButton.addEventListener('click', (event) => {
    console.log('🖱️ [CLICK] Botón MINIMIZAR presionado');
    event.stopPropagation();
    window.electronAPI.minimize();
  });

  // Maximizar/Restaurar ventana
  maximizeButton.addEventListener('click', (event) => {
    console.log('🖱️ [CLICK] Botón MAXIMIZAR presionado');
    event.stopPropagation();
    window.electronAPI.toggleMaximize();
  });

  // Cerrar ventana
  closeButton.addEventListener('click', (event) => {
    console.log('🖱️ [CLICK] Botón CERRAR presionado');
    event.stopPropagation();
    window.electronAPI.close();
  });

  // Actualizar icono de maximizar cuando cambia el estado
  const updateMaximizeIcon = async (): Promise<void> => {
    try {
      const isMaximized = await window.electronAPI.isMaximized();
      console.log('ℹ️ [TitleBar] Estado de maximización:', isMaximized);

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
    } catch (error) {
      console.error('❌ [TitleBar] Error al consultar isMaximized:', error);
    }
  };

  // Escuchar cambios de estado de maximización
  if (typeof window.electronAPI.onMaximizeChange === 'function') {
    window.electronAPI.onMaximizeChange(updateMaximizeIcon);
  }

  // Inicializar el icono
  void updateMaximizeIcon();
}
