import type { ClickPoint } from './types.js';

// Este módulo localiza los menús y selecciones de SofiaPlus para avanzar por el flujo de navegación guiado.

// (Sin helpers de módulo en este archivo: las funciones exportadas se serializan con
// `.toString()` y se ejecutan dentro de la página de SofiaPlus, donde esos helpers no existen.)

// Busca la opción de Aspirante dentro de los selectores o controles visibles del portal.
export async function openAspiranteOptions(): Promise<ClickPoint | null> {
  const findVisibleText = (selector: string, text: string): HTMLElement | null => {
    const target = text.trim().toLocaleLowerCase();
    return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) => {
      const value = element.textContent?.trim().toLocaleLowerCase();
      return value === target && element.getClientRects().length > 0;
    }) ?? null;
  };
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

// Encuentra la opción de Gestión de Ambientes y la activa para continuar con el módulo consultado.
export async function findEnvironmentManagementOption(): Promise<ClickPoint | null> {
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
  )).find((element) => element.textContent?.trim().toLocaleLowerCase() === 'gestión de ambientes'
    && element.getClientRects().length > 0);
  if (!control) return null;
  const eventOptions = { bubbles: true, cancelable: true, view: window, button: 0, detail: 1 };
  control.dispatchEvent(new MouseEvent('mousedown', eventOptions));
  control.dispatchEvent(new MouseEvent('mouseup', eventOptions));
  control.dispatchEvent(new MouseEvent('click', eventOptions));
  control.click();
  return pointFor(control.matches('a, button') ? control : control.querySelector<HTMLElement>('a[href], a[onclick], button') ?? control);
}

// Abre la opción de Gestion Ambientes dentro del menú de gestión.
export async function findAmbientesOption(): Promise<ClickPoint | null> {
  const pointFor = (element: HTMLElement): ClickPoint => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
  };
  const control = Array.from(document.querySelectorAll<HTMLElement>(
    'a[href], a[onclick], button, [role="menuitem"], [role="option"], li',
  )).find((element) => element.textContent?.trim().toLocaleLowerCase() === 'gestion ambientes'
    && element.getClientRects().length > 0);
  if (!control) return null;
  const clickable = control.matches('a, button')
    ? control
    : control.querySelector<HTMLElement>('a[href], a[onclick], button') ?? control;
  clickable.click();
  return pointFor(clickable);
}

// Abre la opción de Consulta de Tiempos de Instructor por Actividad de Formación.
export async function findInstructorActivityTimeOption(): Promise<ClickPoint | null> {
  const pointFor = (element: HTMLElement): ClickPoint => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
  };
  const control = Array.from(document.querySelectorAll<HTMLElement>(
    'a[href], a[onclick], button, [role="menuitem"], [role="option"], li',
  )).find((element) => {
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    return text === 'consulta de tiempos de instructor por actividad de formación'
      && element.getClientRects().length > 0;
  });
  if (!control) return null;
  const clickable = control.matches('a, button')
    ? control
    : control.querySelector<HTMLElement>('a[href], a[onclick], button') ?? control;
  clickable.click();
  return pointFor(clickable);
}

// Abre la ventana de selección de programa de formación (lupa del campo Programa de Formación).
export async function findProgramLookupButton(): Promise<ClickPoint | null> {
  const pointFor = (element: HTMLElement): ClickPoint => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
  };
  const normalize = (value: string): string => value.trim().toLocaleLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const byNormalizedId = Array.from(document.querySelectorAll<HTMLElement>('[id], [name]'))
    .find((element) => normalize(element.id).includes('programaformacionolk')
      || normalize(element.getAttribute('name') ?? '').includes('programaformacionolk')) ?? null;
  const picker = document.querySelector<HTMLElement>('[id$=":programaFormacionOLK"], [id$="programaFormacionOLK"]')
    ?? byNormalizedId;
  if (!(picker instanceof HTMLElement)) return null;
  const clickable = picker.closest('a') ?? picker;
  clickable.click();
  return pointFor(clickable);
}

// Abre la opción de Reportes para continuar con el módulo consultado.
export async function findReportsOption(): Promise<ClickPoint | null> {
  const pointFor = (element: HTMLElement): ClickPoint => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
  };
  const control = Array.from(document.querySelectorAll<HTMLElement>(
    'a[href], a[onclick], button, [role="menuitem"], [role="option"], li',
  )).find((element) => element.textContent?.trim().toLocaleLowerCase() === 'reportes'
    && element.getClientRects().length > 0);
  if (!control) return null;
  const clickable = control.matches('a, button')
    ? control
    : control.querySelector<HTMLElement>('a[href], a[onclick], button') ?? control;
  clickable.click();
  return pointFor(clickable);
}
