import type { AppElements } from '../types.js';
import { getThemeLabel, isTheme } from '../theme/types.js';
import type { ThemeService } from '../theme/theme-service.js';

/** Conecta el botón y sus opciones con el servicio de temas. */
export function initThemeSelector(
  elements: Pick<AppElements, 'themeToggle'>,
  themeService: ThemeService,
): void {
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

  const updateLabel = (): void => {
    themeLabel.textContent = getThemeLabel(themeService.getSelectedTheme());
  };

  updateLabel();
  setDropdownOpen(false);
  themeService.subscribe(updateLabel);

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
      const selectedTheme = option.dataset.theme;
      if (!isTheme(selectedTheme)) return;

      themeService.setTheme(selectedTheme);
      setDropdownOpen(false);
    });
  });
}
