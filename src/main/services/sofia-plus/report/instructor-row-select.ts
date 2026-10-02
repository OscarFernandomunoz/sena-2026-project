import type { ClickPoint } from '../types.js';

// Localiza el icono amarillo de selección (enviarParametro) en la fila de resultados del
// diálogo de funcionario y devuelve la coordenada donde hacer clic.
//
// Esta función SOLO ubica el elemento: el clic lo da clickScript con eventos de ratón reales.
// No se tocan campos ni handlers del portal; SofiaPlus ejecuta enviarParametro por sí sola.
//
// ⚠️ Esta función se serializa con `.toString()` y se ejecuta dentro de la página de
// SofiaPlus. NO puede referenciar imports, constantes de módulo ni helpers externos: todos
// los auxiliares van dentro del propio cuerpo.

export async function findInstructorRowSelect(): Promise<ClickPoint | null> {
  // El punto se ajusta subiendo por los iframes anidados hasta la ventana superior: los
  // eventos de ratón se emiten en coordenadas de la ventana, no del iframe.
  const pointFor = (element: HTMLElement): ClickPoint => {
    const rect = element.getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top + rect.height / 2;
    let currentWindow: Window = window;
    while (currentWindow.frameElement) {
      const frameRect = currentWindow.frameElement.getBoundingClientRect();
      x += frameRect.left;
      y += frameRect.top;
      currentWindow = currentWindow.parent;
    }
    return { x, y };
  };

  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[id], a[onclick], a[href]'));
  const isRowSelect = (anchor: HTMLAnchorElement): boolean => {
    const id = (anchor.getAttribute('id') ?? '').toLowerCase();
    return id.includes('cmdlnkshow');
  };
  const visible = (element: HTMLElement): boolean => element.getClientRects().length > 0;

  let target = anchors.find((anchor) => isRowSelect(anchor) && visible(anchor));
  if (!target) {
    target = Array.from(document.querySelectorAll<HTMLAnchorElement>(
      'a[id$=":cmdlnkShow"], a[id*="cmdlnkShow"]',
    )).find(visible);
  }
  if (!target) {
    target = Array.from(document.querySelectorAll<HTMLAnchorElement>('tbody a, table a, td a')).find(visible);
  }
  if (!target) {
    console.warn('[Reporte] No se encontró el enlace de selección en la lista de usuarios.');
    return null;
  }

  const clickable = (target.closest('a') as HTMLElement | null) ?? target;
  // Se marca el propio elemento con borde rojo + glow para que la esfera quede
  // exactamente sobre el botón sin depender de coordenadas del iframe.
  clickable.style.border = '3px solid #ff3b30';
  clickable.style.borderRadius = '50%';
  clickable.style.boxShadow = '0 0 0 3px rgba(255,59,48,0.35)';
  clickable.style.outline = '3px solid #ff3b30';
  clickable.style.outlineOffset = '2px';
  clickable.style.zIndex = '2147483647';

  console.log(`[Reporte] Enlace de selección marcado: ${JSON.stringify({
    id: target.getAttribute('id') ?? '(sin id)',
    onclick: (target.getAttribute('onclick') ?? '').slice(0, 60),
    visible: visible(clickable),
    frame: location.pathname,
  })}`);
  return visible(clickable) ? pointFor(clickable) : null;
}

// Hace clic DOM en el icono amarillo de la fila (igual que el clic manual del usuario):
// el manejador inline enviarParametro del portal se ejecuta sin depender de coordenadas.
export async function selectInstructorRow(): Promise<boolean> {
  const isRowSelect = (anchor: HTMLAnchorElement): boolean => {
    const id = (anchor.getAttribute('id') ?? '').toLowerCase();
    return id.includes('cmdlnkshow');
  };
  const isVisible = (element: HTMLElement): boolean => element.getClientRects().length > 0;
  let target = Array.from(document.querySelectorAll<HTMLAnchorElement>(
    'a[id], a[onclick], a[href]',
  )).find((anchor) => isRowSelect(anchor) && isVisible(anchor));
  if (!target) {
    target = Array.from(document.querySelectorAll<HTMLAnchorElement>(
      'a[id$=":cmdlnkShow"], a[id*="cmdlnkShow"]',
    )).find(isVisible);
  }
  if (!target) {
    target = Array.from(document.querySelectorAll<HTMLAnchorElement>('tbody a, table a, td a')).find(isVisible);
  }
  if (!target) return false;
  const clickable = target.closest('a') ?? target;
  clickable.click();
  return true;
}
