import type { ClickPoint } from './types.js';

// Este módulo localiza los menús y selecciones de SofiaPlus para avanzar por el flujo de navegación guiado.

function findVisibleText(selector: string, text: string): HTMLElement | null {
  const target = text.trim().toLocaleLowerCase();
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) => {
    const value = element.textContent?.trim().toLocaleLowerCase();
    return value === target && element.getClientRects().length > 0;
  }) ?? null;
}

// Busca la opción de Aspirante dentro de los selectores o controles visibles del portal.
export async function openAspiranteOptions(): Promise<ClickPoint | null> {
  const pointFor = (element: HTMLElement): ClickPoint => {
    const rect = element.getBoundingClientRect();
    let x = rect.left + (rect.width / 2);
    let y = rect.top + (rect.height / 2);
    let currentWindow: Window = window;
    while (currentWindow.frameElement) {
      const frameRect = currentWindow.frameElement.getBoundingClientRect();
      x += frameRect.left;
      y += frameRect.top;
      currentWindow = currentWindow.parent;
    }
    return { x, y };
  };
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'))
    .filter((element) => element.getClientRects().length > 0);
  const aspiranteSelect = selects.find((select) => Array.from(select.options).some((option) => (
    option.textContent?.trim().toLowerCase() === 'aspirante'
  )));
  if (aspiranteSelect) return pointFor(aspiranteSelect);

  const control = findVisibleText('button, [role="button"], [role="combobox"]', 'aspirante');
  return control ? pointFor(control) : null;
}

// Selecciona la opción de Gestión Desarrollo Curricular dentro del menú desplegable o en controles visibles.
export async function selectCurriculumOption(): Promise<boolean> {
  const target = 'gestión desarrollo curricular';
  const normalize = (text: string): string => text.trim().toLocaleLowerCase();
  for (const select of Array.from(document.querySelectorAll<HTMLSelectElement>('select'))) {
    const option = Array.from(select.options).find((item) => normalize(item.textContent ?? '') === target);
    if (option && select.getClientRects().length > 0) {
      select.value = option.value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  const control = Array.from(document.querySelectorAll<HTMLElement>(
    'a, button, [role="menuitem"], [role="option"], li',
  )).find((element) => normalize(element.textContent ?? '') === target && element.getClientRects().length > 0);
  if (control) control.click();
  return Boolean(control);
}

// Encuentra la opción de Gestión de Tiempos y la activa para continuar con el módulo consultado.
export async function findTimeManagementOption(): Promise<ClickPoint | null> {
  const pointFor = (element: HTMLElement): ClickPoint => {
    const rect = element.getBoundingClientRect();
    let x = rect.left + (rect.width / 2);
    let y = rect.top + (rect.height / 2);
    let currentWindow: Window = window;
    while (currentWindow.frameElement) {
      const frameRect = currentWindow.frameElement.getBoundingClientRect();
      x += frameRect.left;
      y += frameRect.top;
      currentWindow = currentWindow.parent;
    }
    return { x, y };
  };
  const control = Array.from(document.querySelectorAll<HTMLElement>(
    'a[href], a[onclick], button, [role="menuitem"], [role="option"], li',
  )).find((element) => element.textContent?.trim().toLocaleLowerCase() === 'gestión de tiempos'
    && element.getClientRects().length > 0);
  if (!control) return null;
  const eventOptions = { bubbles: true, cancelable: true, view: window, button: 0, detail: 1 };
  control.dispatchEvent(new MouseEvent('mousedown', eventOptions));
  control.dispatchEvent(new MouseEvent('mouseup', eventOptions));
  control.dispatchEvent(new MouseEvent('click', eventOptions));
  control.click();
  return pointFor(control.matches('a, button') ? control : control.querySelector<HTMLElement>('a[href], a[onclick], button') ?? control);
}

// Abre la opción de Consultar Consolidado de Tiempos dentro del menú de gestión.
export async function findConsolidatedTimeOption(): Promise<ClickPoint | null> {
  const pointFor = (element: HTMLElement): ClickPoint => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
  };
  const control = Array.from(document.querySelectorAll<HTMLElement>(
    'a[href], a[onclick], button, [role="menuitem"], [role="option"], li',
  )).find((element) => element.textContent?.trim().toLocaleLowerCase() === 'consultar consolidado de tiempos'
    && element.getClientRects().length > 0);
  if (!control) return null;
  const clickable = control.matches('a, button')
    ? control
    : control.querySelector<HTMLElement>('a[href], a[onclick], button') ?? control;
  clickable.click();
  return pointFor(clickable);
}

// Abre la opción de Consultar Registro de Tiempo de Instructores para entrar al formulario final.
export async function findInstructorTimeOption(): Promise<ClickPoint | null> {
  const pointFor = (element: HTMLElement): ClickPoint => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
  };
  const control = Array.from(document.querySelectorAll<HTMLElement>(
    'a[href], a[onclick], button, [role="menuitem"], [role="option"], li',
  )).find((element) => element.textContent?.trim().toLocaleLowerCase() === 'consultar registro de tiempo de instructores'
    && element.getClientRects().length > 0);
  if (!control) return null;
  const clickable = control.matches('a, button')
    ? control
    : control.querySelector<HTMLElement>('a[href], a[onclick], button') ?? control;
  clickable.click();
  return pointFor(clickable);
}
