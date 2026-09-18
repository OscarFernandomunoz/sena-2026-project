import type { AppElements } from './types.js';

type Theme = 'light' | 'dark' | 'system';

export function initTheme(elements: Pick<AppElements, 'themeToggle'>): void {
  // Usar sistema por defecto, limpiar valores antiguos si no son válidos
  const savedTheme = localStorage.getItem('aia-theme') as Theme;
  const validThemes: Theme[] = ['light', 'dark', 'system'];
  const initialTheme = savedTheme && validThemes.includes(savedTheme) ? savedTheme : 'system';

  const themeDropdown = document.getElementById('themeDropdown') as HTMLElement;
  const themeLabel = document.getElementById('themeLabel') as HTMLElement;
  const themeOptions = document.querySelectorAll('.theme-option') as NodeListOf<HTMLButtonElement>;

  // Aplicar tema inicial
  applyTheme(initialTheme, themeLabel);

  // Toggle dropdown
  elements.themeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    themeDropdown.classList.toggle('is-open');
  });

  // Cerrar dropdown al hacer clic fuera
  document.addEventListener('click', () => {
    themeDropdown.classList.remove('is-open');
  });

  // Manejar selección de tema
  themeOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedTheme = option.dataset.theme as Theme;
      localStorage.setItem('aia-theme', selectedTheme);
      applyTheme(selectedTheme, themeLabel);
      themeDropdown.classList.remove('is-open');
    });
  });

  // Escuchar cambios en el tema del sistema
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('aia-theme') === 'system') {
      applyTheme('system', themeLabel);
    }
  });
}

function applyTheme(theme: Theme, label: HTMLElement): void {
  let actualTheme: 'light' | 'dark';

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    actualTheme = prefersDark ? 'dark' : 'light';
    label.textContent = 'Sistema';
  } else {
    actualTheme = theme;
    label.textContent = theme === 'dark' ? 'Oscuro' : 'Claro';
  }

  document.documentElement.dataset.theme = actualTheme;
}
