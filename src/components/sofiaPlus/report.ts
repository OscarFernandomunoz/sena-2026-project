import type { ClickPoint } from './types.js';

// Este módulo rellena los filtros del reporte y selecciona la identificación requerida para consultar tiempos.

// Busca los campos de fecha del formulario y les asigna el rango solicitado por el usuario.
export async function fillReportDates(dates: { startDate: string; endDate: string }): Promise<boolean> {
  const fields = Array.from(document.querySelectorAll<HTMLInputElement>('input'))
    .filter((field) => field.type !== 'hidden' && field.getClientRects().length > 0);
  const fieldText = (field: HTMLInputElement): string => [
    field.type, field.name, field.id, field.placeholder, field.getAttribute('aria-label') ?? '',
    field.parentElement?.textContent ?? '',
  ].join(' ').toLocaleLowerCase();
  const findField = (patterns: string[]): HTMLInputElement | undefined => fields.find((field) => {
    const text = fieldText(field);
    return patterns.some((pattern) => text.includes(pattern));
  });
  const setValue = (field: HTMLInputElement | undefined, value: string): void => {
    if (!field) return;
    const [year, month, day] = value.split('-');
    const nextValue = field.type === 'date' || !year || !month || !day ? value : `${day}/${month}/${year}`;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(field, nextValue);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
  };
  const startDate = findField(['fecha inicio', 'fecha de inicio', 'inicio', 'desde']);
  const endDate = findField(['fecha fin', 'fecha de fin', 'fin', 'hasta']);
  if (!startDate || !endDate) return false;
  setValue(startDate, dates.startDate);
  setValue(endDate, dates.endDate);
  return true;
}

// Hace clic en el enlace de lookup del instructor para abrir el diálogo de selección.
export async function findInstructorPicker(): Promise<boolean> {
  const picker = document.getElementById('formConsultarRegistroTiempo:instructorOLK')
    ?? document.querySelector<HTMLElement>('[id="formConsultarRegistroTiempo:instructorOLK"]')
    ?? document.querySelector<HTMLElement>('a[id$="instructorOLK"]');
  if (!(picker instanceof HTMLElement) || picker.getClientRects().length === 0) return false;

  const clickable = picker.closest('a') ?? picker;
  clickable.click();
  return true;
}

// Abre el select de tipo de identificación del diálogo de instructor.
export async function openIdentificationTypeSelect(): Promise<ClickPoint | null> {
  const select = document.querySelector<HTMLSelectElement>('select[id$=":inputTipoIdentificacion"]')
    ?? document.querySelector<HTMLSelectElement>('select[id*="inputTipoIdentificacion"]');
  if (!(select instanceof HTMLSelectElement)) return null;
  select.focus();
  const rect = select.getBoundingClientRect();
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
}

// Elige la opción de cédula de ciudadanía en el selector del formulario de reporte.
export async function selectCitizenshipId(): Promise<boolean> {
  const normalize = (text: string): string => text.trim().toLocaleLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const target = 'cedula de ciudadania';
  const select = document.querySelector<HTMLSelectElement>('select[id$=":inputTipoIdentificacion"]')
    ?? document.querySelector<HTMLSelectElement>('select[id*="inputTipoIdentificacion"]');
  if (!(select instanceof HTMLSelectElement)) return false;
  const option = Array.from(select.options).find((item) => normalize(item.textContent ?? '') === target);
  if (!option) return false;
  select.selectedIndex = option.index;
  select.value = option.value;
  select.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  select.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  return select.selectedIndex === option.index;
}

// Escribe la primera identificación del archivo en el campo del diálogo de instructor.
export async function fillInstructorIdentification(identification: string): Promise<boolean> {
  const input = document.querySelector<HTMLInputElement>('input[id$="inputIdentificacion"]')
    ?? document.querySelector<HTMLInputElement>('input[id*="inputIdentificacion"]');
  if (!(input instanceof HTMLInputElement) || input.getClientRects().length === 0 || !identification) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, identification);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.blur();
  return input.value === identification;
}

// Busca y devuelve la posición del botón Consultar del diálogo de instructor.
export async function findInstructorSearchButton(): Promise<ClickPoint | null> {
  const normalize = (text: string): string => text.trim().toLocaleLowerCase();
  const buttonById = document.querySelector<HTMLElement>(
    'input[id$=":btnSearch"], button[id$=":btnSearch"], input[id$="btnSearch"], button[id$="btnSearch"]',
  );
  const button = buttonById ?? Array.from(document.querySelectorAll<HTMLElement>(
    'input[type="button"], input[type="submit"], button',
  )).find((element) => {
    const label = [
      element.getAttribute('value') ?? '',
      element.textContent ?? '',
      element.getAttribute('aria-label') ?? '',
      element.getAttribute('name') ?? '',
    ].map(normalize);
    return label.includes('consultar') && element.getClientRects().length > 0;
  });
  if (!button) return null;
  if (button.getClientRects().length === 0) return null;
  const rect = button.getBoundingClientRect();
  let x = rect.left + (rect.width / 2);
  let y = rect.top + (rect.height / 2);
  let currentWindow: Window = window;
  while (currentWindow.frameElement) {
    const frameRect = currentWindow.frameElement.getBoundingClientRect();
    x += frameRect.left;
    y += frameRect.top;
    currentWindow = currentWindow.parent;
  }
  console.log(`Botón Consultar encontrado por ID: ${button.id}. Coordenadas: ${x}, ${y}`);
  return { x, y };
}

export async function clickInstructorSearchButton(): Promise<boolean> {
  const button = document.querySelector<HTMLElement>(
    'input[id$=":btnSearch"], button[id$=":btnSearch"], input[id$="btnSearch"], button[id$="btnSearch"]',
  ) ?? Array.from(document.querySelectorAll<HTMLElement>(
    'input[type="button"], input[type="submit"], button',
  )).find((element) => {
    const label = [
      element.getAttribute('value') ?? '',
      element.textContent ?? '',
      element.getAttribute('aria-label') ?? '',
    ].join(' ').trim().toLocaleLowerCase();
    return label.includes('consultar') && element.getClientRects().length > 0;
  });
  if (!button || button.getClientRects().length === 0) return false;
  button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
  button.click();
  return true;
}

export async function instructorResultsLoaded(): Promise<boolean> {
  const pageText = document.body.textContent?.toLocaleLowerCase() ?? '';
  const hasResultsTitle = pageText.includes('lista de usuarios sena');
  const hasResultRow = Array.from(document.querySelectorAll('table tbody tr'))
    .some((row) => row.getClientRects().length > 0 && row.textContent?.trim());
  return hasResultsTitle || hasResultRow;
}
