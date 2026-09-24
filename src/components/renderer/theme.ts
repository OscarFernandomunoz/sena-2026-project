import type { AppElements } from './types.js';

type Theme = 'light' | 'dark' | 'system';

export function initTheme(elements: Pick<AppElements, 'themeToggle'>): void {
  const savedTheme = localStorage.getItem('aia-theme') as Theme | null;
  const validThemes: Theme[] = ['light', 'dark', 'system'];
  const initialTheme = savedTheme && validThemes.includes(savedTheme) ? savedTheme : 'system';

  const themeToggle = elements.themeToggle;
  const themeSelector = themeToggle.closest<HTMLElement>('.theme-selector');
  const themeDropdown = document.getElementById('themeDropdown');
  const themeLabel = document.getElementById('themeLabel');
  const themeOptions = document.querySelectorAll<HTMLButtonElement>('.theme-option');

  if (!themeSelector || !themeDropdown || !themeLabel) {
    console.error('❌ [Theme] No se encontraron los controles del selector de tema');
    return;
  }

  const setDropdownOpen = (isOpen: boolean): void => {
    themeDropdown.classList.toggle('is-open', isOpen);
    themeToggle.setAttribute('aria-expanded', String(isOpen));
  };

  // Usar el sistema por defecto y aplicar el tema guardado.
  applyTheme(initialTheme, themeLabel);
  setDropdownOpen(false);

  themeToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setDropdownOpen(!themeDropdown.classList.contains('is-open'));
  });

  // Cerrar únicamente cuando el clic ocurre fuera del selector.
  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && themeSelector.contains(event.target)) return;
    setDropdownOpen(false);
  });

  themeOptions.forEach((option) => {
    option.addEventListener('click', (event) => {
      event.stopPropagation();
      const selectedTheme = option.dataset.theme as Theme | undefined;
      if (!selectedTheme || !validThemes.includes(selectedTheme)) return;

      localStorage.setItem('aia-theme', selectedTheme);
      applyTheme(selectedTheme, themeLabel);
      setDropdownOpen(false);
    });
  });

  // Escuchar cambios del tema del sistema.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('aia-theme') === 'system') {
      applyTheme('system', themeLabel);
    }
  });
}

function applyTheme(theme: Theme, label: HTMLElement): void {
  let actualTheme: 'light' | 'dark';

  if (theme === 'system') {
    actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    label.textContent = 'Sistema';
  } else {
    actualTheme = theme;
    label.textContent = theme === 'dark' ? 'Oscuro' : 'Claro';
  }

  document.documentElement.dataset.theme = actualTheme;
}
