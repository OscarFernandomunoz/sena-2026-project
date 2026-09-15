import type { AppElements } from './types.js';

type Theme = 'light' | 'dark';

export function initTheme(elements: Pick<AppElements, 'themeToggle'>): void {
  const savedTheme = localStorage.getItem('aia-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light', elements, false);
  elements.themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme, elements, true);
    localStorage.setItem('aia-theme', nextTheme);
  });
}

function setTheme(theme: Theme, elements: Pick<AppElements, 'themeToggle'>, animate: boolean): void {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  window.electronAPI.setTheme(theme);
  elements.themeToggle.setAttribute('aria-pressed', String(isDark));
  elements.themeToggle.setAttribute('aria-label', isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  elements.themeToggle.innerHTML = `<i class="fa-solid fa-${isDark ? 'sun' : 'moon'}" aria-hidden="true"></i><span>Tema ${isDark ? 'claro' : 'oscuro'}</span>`;
  if (animate) {
    elements.themeToggle.classList.remove('is-switching');
    void elements.themeToggle.offsetWidth;
    elements.themeToggle.classList.add('is-switching');
    window.setTimeout(() => elements.themeToggle.classList.remove('is-switching'), 520);
  }
}
