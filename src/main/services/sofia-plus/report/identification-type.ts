import type { ClickPoint } from '../types.js';

// Selección del tipo de identificación (cédula de ciudadanía) en el diálogo de instructor.
//
// ⚠️ Las funciones de esta carpeta se serializan con `.toString()` y se ejecutan dentro de
// la página de SofiaPlus. NO pueden referenciar imports, constantes de módulo ni helpers
// externos: todo lo que usen debe existir dentro del propio cuerpo de cada función.

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
    if (!currentWindow.parent || currentWindow.parent === currentWindow) break;
    currentWindow = currentWindow.parent;
  }
  return { x, y };
}

// Elige la opción de cédula de ciudadanía en el selector del formulario de reporte.
export async function selectCitizenshipId(): Promise<boolean> {
  const normalize = (text: string): string => text.trim().toLocaleLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const targets = ['cedula de ciudadania', 'cedula ciudadania', 'cedula', 'cc', 'c.c.', 'documento de identidad'];
  const select = document.querySelector<HTMLSelectElement>('select[id$=":inputTipoIdentificacion"]')
    ?? document.querySelector<HTMLSelectElement>('select[id*="inputTipoIdentificacion"]')
    ?? document.querySelector<HTMLSelectElement>('select');
  if (!(select instanceof HTMLSelectElement)) {
    console.error('[Reporte] No se encontró el selector de tipo de identificación.');
    return false;
  }
  console.log('[Reporte] Selector de tipo de identificación encontrado. Opciones disponibles:', select.options.length);
  Array.from(select.options).forEach((opt, i) => {
    console.log(`[Reporte] Opción ${i}: valor="${opt.value}", texto="${opt.textContent?.trim()}", texto normalizado="${normalize(opt.textContent ?? '')}"`);
  });
  let optionIndex = -1;
  for (const target of targets) {
    const found = Array.from(select.options).findIndex((item) => normalize(item.textContent ?? '') === target);
    if (found !== -1) { optionIndex = found; break; }
  }
  if (optionIndex === -1) {
    for (const target of targets) {
      const found = Array.from(select.options).findIndex((item) => normalize(item.textContent ?? '').includes(target));
      if (found !== -1) { optionIndex = found; break; }
    }
  }
  if (optionIndex === -1) {
    console.warn('[Reporte] Ninguna opción de identificación coincide con los criterios evaluados.', targets);
    return false;
  }
  const option = select.options[optionIndex];
  if (!option) {
    console.error('[Reporte] La opción de cédula de ciudadanía no está disponible.');
    return false;
  }
  console.log(`[Reporte] Opción de cédula seleccionada (índice ${optionIndex}): "${option.textContent?.trim() ?? ''}".`);
  select.selectedIndex = optionIndex;
  select.value = option.value;
  select.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  select.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  return select.selectedIndex === optionIndex;
}
