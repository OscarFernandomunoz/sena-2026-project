import { initThemeSelector } from '../components/theme-selector.js';
import type { AppElements } from '../types.js';
import { ThemeService } from './theme-service.js';
import type { ThemeListener } from './types.js';

export type { ResolvedTheme, Theme, ThemeListener } from './types.js';

const themeService = new ThemeService();

export function initTheme(elements: Pick<AppElements, 'themeToggle'>): void {
  themeService.start();
  initThemeSelector(elements, themeService);
}

export function subscribeToTheme(listener: ThemeListener): () => void {
  return themeService.subscribe(listener);
}
