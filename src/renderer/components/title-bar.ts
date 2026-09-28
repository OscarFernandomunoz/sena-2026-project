import { subscribeToTheme } from '../theme/index.js';

// Activa los controles nativos del sistema y conserva los botones HTML como fallback.
export function initTitleBar(): void {
  if (typeof window.electronAPI === 'undefined') {
    console.error('[AIA][Renderer][TitleBar] window.electronAPI no está disponible. Revisa el preload script.');
    return;
  }

  const titleBarPlatform = window.electronAPI.titleBarPlatform;
  document.documentElement.dataset.titleBarPlatform = titleBarPlatform;

  subscribeToTheme((theme) => {
    window.electronAPI.setTitleBarTheme(theme);
  });

  // En macOS, Windows y Linux los controles ya los dibuja el sistema operativo.
  if (titleBarPlatform !== 'custom') return;

  initFallbackControls();
  initFallbackDoubleClick();
}

function initFallbackControls(): void {
  const minimizeButton = document.getElementById('minimizeButton') as HTMLButtonElement | null;
  const maximizeButton = document.getElementById('maximizeButton') as HTMLButtonElement | null;
  const closeButton = document.getElementById('closeButton') as HTMLButtonElement | null;

  if (!minimizeButton || !maximizeButton || !closeButton) {
    console.error('[AIA][Renderer][TitleBar] No se encontraron los controles de fallback.');
    return;
  }

  minimizeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    window.electronAPI.minimize();
  });

  maximizeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    window.electronAPI.toggleMaximize();
  });

  closeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    window.electronAPI.close();
  });

  const updateMaximizeIcon = async (): Promise<void> => {
    try {
      const isMaximized = await window.electronAPI.isMaximized();
      maximizeButton.setAttribute('aria-label', isMaximized ? 'Restaurar' : 'Maximizar');
      maximizeButton.innerHTML = isMaximized
        ? `
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
            <rect x="0" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
          </svg>
        `
        : `
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            <rect width="10" height="10" fill="none" stroke="currentColor" stroke-width="1"/>
          </svg>
        `;
    } catch (error) {
      console.error('[AIA][Renderer][TitleBar] No se pudo consultar el estado de maximización.', error);
    }
  };

  window.electronAPI.onMaximizeChange(() => {
    void updateMaximizeIcon();
  });

  void updateMaximizeIcon();
}

function initFallbackDoubleClick(): void {
  const titleBar = document.querySelector<HTMLElement>('.title-bar');
  if (!titleBar) return;

  titleBar.addEventListener('dblclick', (event) => {
    if ((event.target as Element | null)?.closest('.windows-window-controls')) return;
    window.electronAPI.toggleMaximize();
  });
}
