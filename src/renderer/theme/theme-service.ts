import {
  THEME_STORAGE_KEY,
  isTheme,
  type ResolvedTheme,
  type Theme,
  type ThemeListener,
} from './types.js';

/** Estado y persistencia del tema; no conoce el DOM del selector visual. */
export class ThemeService {
  private readonly mediaQuery: MediaQueryList;
  private readonly listeners = new Set<ThemeListener>();
  private selectedTheme: Theme;
  private started = false;

  constructor() {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.selectedTheme = this.readSavedTheme();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange);
    this.applyTheme(this.selectedTheme);
  }

  getSelectedTheme(): Theme {
    return this.selectedTheme;
  }

  getResolvedTheme(): ResolvedTheme {
    return this.resolveTheme(this.selectedTheme);
  }

  setTheme(theme: Theme): void {
    this.applyTheme(theme);
  }

  subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    listener(this.getResolvedTheme());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private readonly handleSystemThemeChange = (): void => {
    if (this.selectedTheme === 'system') {
      this.applyTheme('system');
    }
  };

  private applyTheme(theme: Theme): void {
    this.selectedTheme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // La aplicación puede ejecutarse sin almacenamiento disponible.
    }
    document.documentElement.dataset.theme = this.resolveTheme(theme);
    this.notifyListeners();
  }

  private resolveTheme(theme: Theme): ResolvedTheme {
    if (theme === 'system') {
      return this.mediaQuery.matches ? 'dark' : 'light';
    }
    return theme;
  }

  private readSavedTheme(): Theme {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) ?? undefined;
      return isTheme(savedTheme) ? savedTheme : 'system';
    } catch {
      return 'system';
    }
  }

  private notifyListeners(): void {
    const resolvedTheme = this.getResolvedTheme();
    for (const listener of this.listeners) {
      listener(resolvedTheme);
    }
  }
}
