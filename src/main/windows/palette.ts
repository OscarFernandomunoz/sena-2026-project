// Paleta de la barra de título nativa, compartida por las opciones de ventana y por el
// script de cromo que se inyecta en las páginas remotas.
export const TITLE_BAR_THEME_COLORS = {
  light: { background: '#f7f7f5', text: '#5f5f5b', border: '#f7f7f5' },
  dark: { background: '#181818', text: '#c7c7c4', border: '#181818' },
} as const;

export const TITLE_BAR_OVERLAY_COLORS = {
  light: {
    color: TITLE_BAR_THEME_COLORS.light.background,
    symbolColor: TITLE_BAR_THEME_COLORS.light.text,
  },
  dark: {
    color: TITLE_BAR_THEME_COLORS.dark.background,
    symbolColor: TITLE_BAR_THEME_COLORS.dark.text,
  },
} as const;
