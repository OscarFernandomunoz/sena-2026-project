import type { ClickPoint } from '../types.js';

// Selección del tipo de identificación (cédula de ciudadanía) en el diálogo de instructor.
//
// ⚠️ Las funciones de esta carpeta se serializan con `.toString()` y se ejecutan dentro de
// la página de SofiaPlus. NO pueden referenciar imports, constantes de módulo ni helpers
// externos: todo lo que usen debe existir dentro del propio cuerpo de cada función.

// Se hace clic sobre el select del diálogo de instructor para abrirlo (solo coordenadas,
// sin marker; el marker visible lo añade markIdentificationTypeSelect).
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

// Solo UBICA el select de tipo de identificación y dibuja la esfera SOLO en el iframe que lo
// contiene (coordenadas LOCALES de ese documento), sin ejecutar ningún clic. Devulve true
// cuando lo encuentra para que el flujo pueda seguir con la asignación de la opción.
export async function markIdentificationTypeSelect(): Promise<boolean> {
  const select = document.querySelector<HTMLSelectElement>('select[id$=":inputTipoIdentificacion"]')
    ?? document.querySelector<HTMLSelectElement>('select[id*="inputTipoIdentificacion"]');
  if (!(select instanceof HTMLSelectElement)) {
    console.error('[Reporte] No se encontró el selector de tipo de identificación para marcar.');
    return false;
  }
  const rect = select.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let marker = document.getElementById('__sofiaTargetMarker__') as HTMLDivElement | null;
  if (!marker) {
    marker = document.createElement('div');
    marker.id = '__sofiaTargetMarker__';
    document.body.appendChild(marker);
  }
  marker.setAttribute('style', [
    'position:fixed',
    `left:${Math.round(cx - 15)}px`,
    `top:${Math.round(cy - 15)}px`,
    'width:30px',
    'height:30px',
    'border:3px solid #ff3b30',
    'border-radius:50%',
    'background:rgba(255,59,48,0.25)',
    'box-shadow:0 0 0 4px rgba(255,59,48,0.35)',
    'pointer-events:none',
    'z-index:2147483647',
  ].join(';'));
  console.log(`[Reporte] Select Tipo de Identificación marcado en (${Math.round(cx)},${Math.round(cy)}) del iframe.`);
  return true;
}

// Elige la opción de cédula de ciudadanía en el selector del formulario de reporte.
export async function selectCitizenshipId(): Promise<boolean> {
  const normalize = (text: string): string => text.trim().toLocaleLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const targets = ['cedula de ciudadania', 'cedula ciudadania', 'cedula', 'cc', 'c.c.', 'documento de identidad'];

  // NUNCA se recurre a un `<select>` arbitrario. La página del portal tiene otros desplegables
  // —en concreto el de rol, con "Aprendiz", "Aspirante", "Equipo de Diseño Curricular"— y
  // modificar uno de esos le cambia el rol al usuario. El fallback solo acepta un desplegable
  // cuyas opciones sean de verdad tipos de identificación.
  const esTipoIdentificacion = (candidate: HTMLSelectElement): boolean => Array.from(candidate.options)
    .some((option) => targets.includes(normalize(option.textContent ?? '')));

  const select = document.querySelector<HTMLSelectElement>('select[id$=":inputTipoIdentificacion"]')
    ?? document.querySelector<HTMLSelectElement>('select[id*="inputTipoIdentificacion"]')
    ?? Array.from(document.querySelectorAll<HTMLSelectElement>('select')).find(esTipoIdentificacion);
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
