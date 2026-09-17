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
  const targets = ['cedula de ciudadania', 'cedula ciudadania', 'cedula', 'cc', 'c.c.', 'documento de identidad'];
  const select = document.querySelector<HTMLSelectElement>('select[id$=":inputTipoIdentificacion"]')
    ?? document.querySelector<HTMLSelectElement>('select[id*="inputTipoIdentificacion"]')
    ?? document.querySelector<HTMLSelectElement>('select');
  if (!(select instanceof HTMLSelectElement)) {
    console.log('❌ selectCitizenshipId: No se encontró ningún select de Tipo de Identificación.');
    return false;
  }
  console.log('🔍 selectCitizenshipId: Select encontrado. Opciones totales:', select.options.length);
  Array.from(select.options).forEach((opt, i) => {
    console.log(`   [${i}] value="${opt.value}" text="${opt.textContent?.trim()}" normalizado="${normalize(opt.textContent ?? '')}"`);
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
    console.log('❌ selectCitizenshipId: Ninguna opción coincide con:', targets);
    return false;
  }
  const option = select.options[optionIndex];
  console.log('✅ selectCitizenshipId: Seleccionando opción:', optionIndex, '"' + option.textContent?.trim() + '"');
  select.selectedIndex = optionIndex;
  select.value = option.value;
  select.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  select.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  return select.selectedIndex === optionIndex;
}

// Escribe la primera identificación del archivo en el campo del diálogo de instructor.
export async function fillInstructorIdentification(identification: string): Promise<boolean> {
  const input = document.querySelector<HTMLInputElement>('input[id$="inputIdentificacion"]')
    ?? document.querySelector<HTMLInputElement>('input[id*="inputIdentificacion"]')
    ?? document.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="number"]')[1];
  if (!(input instanceof HTMLInputElement) || !identification) {
    console.log('❌ fillInstructorIdentification: Input o identificación faltante. input=', !!input, 'identification=', identification);
    return false;
  }
  console.log('🔍 fillInstructorIdentification: Input encontrado. id=', input.id, 'valor previo=', input.value);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, identification);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.blur();
  const ok = input.value === identification || input.value === String(identification).replace(/\D/g, '');
  console.log(ok ? '✅ fillInstructorIdentification: Identificación escrita correctamente: ' + input.value : '❌ fillInstructorIdentification: No se pudo escribir, quedó=' + input.value);
  return ok;
}

// Busca y devuelve la posición del botón Consultar del diálogo de instructor.
function findExactSearchButton(): HTMLElement | null {
  const normalize = (text: string): string => text.trim().toLocaleLowerCase();
  const isVisibleLoose = (element: HTMLElement): boolean => {
    const style = window.getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 40 && rect.height > 18;
  };
  const scrollIntoViewIfNeeded = (element: HTMLElement): void => {
    try {
      const scrollable = element.closest<HTMLElement>('div, form, section, td, tr, body') || document.body;
      const rect = element.getBoundingClientRect();
      if (rect.top < 40 || rect.bottom > (window.innerHeight - 40)) {
        scrollable.scrollTop = (element.offsetTop ?? 0) - 60;
      }
      element.scrollIntoView?.({ behavior: 'auto', block: 'center', inline: 'center' });
    } catch { /* ignore */ }
  };

  // PRIORIDAD 0) ID exacto conocido por captura (j_id_jsp_XXX:btnSearch) + sufijo :btnSearch
  const KNOWN_ID_SUFFIXES = [':btnSearch', ':btSearch', '_btnSearch', '_btSearch'];
  for (const suffix of KNOWN_ID_SUFFIXES) {
    const byId = document.querySelector<HTMLElement>(`input[type="button"][id$="${suffix}"], input[type="submit"][id$="${suffix}"], button[id$="${suffix}"]`);
    if (byId && isVisibleLoose(byId)) {
      console.log(`🎯 [DETECTIVE] ✅ ENCONTRADO por ID sufijo CONOCIDO '${suffix}': id="${byId.id}" name="${byId.getAttribute('name') ?? ''}" class="${byId.className}"`);
      scrollIntoViewIfNeeded(byId);
      return byId;
    }
  }
  for (const suffix of KNOWN_ID_SUFFIXES) {
    const byName = document.querySelector<HTMLElement>(`input[type="button"][name$="${suffix}"], input[type="submit"][name$="${suffix}"]`);
    if (byName && isVisibleLoose(byName)) {
      console.log(`🎯 [DETECTIVE] ✅ ENCONTRADO por NAME sufijo CONOCIDO '${suffix}': name="${byName.getAttribute('name') ?? ''}" id="${byName.id}"`);
      scrollIntoViewIfNeeded(byName);
      return byName;
    }
  }

  // 1) Buscar por ID o NAME con sufijos típicos adicionales de JSF
  const idSuffixes = [':btnConsultar', '_btnConsultar', ':consultar', ':btConsultar', ':buscar', ':btnBuscar'];
  for (const suffix of idSuffixes) {
    const byId = document.querySelector<HTMLElement>(`[id$="${suffix}"]`);
    if (byId && isVisibleLoose(byId)) {
      console.log(`🔎 [DETECTIVE] Encontrado por ID sufijo '${suffix}':`, byId.id);
      scrollIntoViewIfNeeded(byId);
      return byId;
    }
  }
  for (const suffix of idSuffixes) {
    const byName = document.querySelector<HTMLElement>(`[name$="${suffix}"]`);
    if (byName && isVisibleLoose(byName)) {
      console.log(`🔎 [DETECTIVE] Encontrado por NAME sufijo '${suffix}':`, byName.getAttribute('name'));
      scrollIntoViewIfNeeded(byName);
      return byName;
    }
  }

  // 2) Buscar por selector exacto de clase del botón azul (igual que la captura)
  const exactClassSelector = 'input.btn.btn-info.btn-block, input.btn.btn-primary.btn-block, button.btn.btn-info.btn-block';
  const classMatches = Array.from(document.querySelectorAll<HTMLElement>(exactClassSelector)).filter(isVisibleLoose);
  if (classMatches.length) {
    const best = classMatches.sort((a, b) => {
      const areaA = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
      const areaB = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
      return areaB - areaA;
    })[0];
    console.log('🎯 [DETECTIVE] ✅ ENCONTRADO por SELECTOR CLASES (btn-info btn-block):', best.id, best.className);
    scrollIntoViewIfNeeded(best);
    return best;
  }

  // 2b) Cualquier botón con btn-info o btn-block (match más amplio)
  const looseClassMatches = Array.from(document.querySelectorAll<HTMLElement>(
    'input[type="button"], input[type="submit"], button',
  )).filter((el) => {
    const classes = (el.className || '').toString().toLocaleLowerCase();
    return classes.includes('btn-info') || classes.includes('btn-block') || classes.includes('btn-search') || classes.includes('btn-primary');
  }).filter(isVisibleLoose);
  if (looseClassMatches.length) {
    const best = looseClassMatches.sort((a, b) => {
      const areaA = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
      const areaB = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
      return areaB - areaA;
    })[0];
    console.log('🔎 [DETECTIVE] Encontrado por CLASES (btn-info/btn-block/primary):', best.id, best.className);
    scrollIntoViewIfNeeded(best);
    return best;
  }

  // 3) Buscar por texto "Consultar" en value o textContent en TODO el documento
  const allCandidates = Array.from(document.querySelectorAll<HTMLElement>(
    'input[type="button"], input[type="submit"], button, a[role="button"]',
  )).filter((element) => {
    const label = [
      element.getAttribute('value') ?? '',
      element.textContent ?? '',
      element.getAttribute('aria-label') ?? '',
      element.getAttribute('name') ?? '',
      element.id ?? '',
      element.getAttribute('title') ?? '',
    ].map(normalize).join(' ');
    return label.includes('consultar') && isVisibleLoose(element);
  });

  console.log(`🔎 [DETECTIVE] Total botones con "Consultar" visibles: ${allCandidates.length}`);
  allCandidates.forEach((c, i) => {
    const r = c.getBoundingClientRect();
    const id = c.id || 'no-id';
    const nm = c.getAttribute('name') || 'no-name';
    const cls = c.className || 'no-class';
    console.log(`   [${i + 1}] ID=${id} NAME=${nm} CLASS=${cls} RECT=(${r.width.toFixed(0)}x${r.height.toFixed(0)}) POS=(${r.left.toFixed(0)},${r.top.toFixed(0)}) value="${c.getAttribute('value') ?? ''}" text="${(c.textContent ?? '').trim().slice(0, 30)}"`);
  });

  // Si hay candidatos, tomar el más cercano al input de identificación
  const identifierInput = document.querySelector<HTMLInputElement>('input[id*="inputIdentificacion"]');
  const inputRect = identifierInput?.getBoundingClientRect();
  const best = allCandidates.length === 0 ? null : allCandidates
    .map((c) => ({
      el: c,
      dist: inputRect
        ? Math.hypot((c.getBoundingClientRect().left - inputRect.left), (c.getBoundingClientRect().top - inputRect.top))
        : -(c.getBoundingClientRect().width * c.getBoundingClientRect().height),
    }))
    .sort((a, b) => a.dist - b.dist)[0]?.el ?? allCandidates[0];

  if (best) {
    console.log('🔎 [DETECTIVE] Elegido (más cercano a cédula / mayor área):', best.id, best.getAttribute('name'), best.className);
    scrollIntoViewIfNeeded(best);
    return best;
  }
  console.log('❌ [DETECTIVE] NO SE ENCONTRÓ NINGÚN BOTÓN "CONSULTAR" VISIBLE EN EL DOCUMENTO.');
  console.log('   Revisando... total botones=', document.querySelectorAll('input[type="button"], input[type="submit"], button').length);
  return null;
}

export async function findInstructorSearchButton(): Promise<ClickPoint | null> {
  const button = findExactSearchButton();
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
  console.log(`Botón Consultar encontrado. ID: ${button.id}. Name: ${button.getAttribute('name')}. Clases: ${button.className}. Coordenadas: (${x}, ${y})`);
  return { x, y };
}

export async function clickInstructorSearchButton(): Promise<boolean> {
  const button = findExactSearchButton();
  if (!button || button.getClientRects().length === 0) return false;

  const root = document.body ?? document.documentElement;
  const markerId = '__sofiaClickDebugMarker__';
  let marker = document.getElementById(markerId) as HTMLDivElement | null;
  if (!marker) {
    marker = document.createElement('div');
    marker.id = markerId;
    root.appendChild(marker);
  }

  const rect = button.getBoundingClientRect();
  marker.style.position = 'fixed';
  marker.style.left = `${rect.left}px`;
  marker.style.top = `${rect.top}px`;
  marker.style.width = `${rect.width}px`;
  marker.style.height = `${rect.height}px`;
  marker.style.pointerEvents = 'none';
  marker.style.zIndex = '2147483647';
  marker.style.border = '3px solid #ff3b30';
  marker.style.borderRadius = '8px';
  marker.style.background = 'rgba(255, 59, 48, 0.18)';
  marker.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.16)';
  marker.style.display = 'flex';
  marker.style.alignItems = 'flex-start';
  marker.style.justifyContent = 'flex-start';
  marker.style.fontSize = '10px';
  marker.style.fontWeight = '700';
  marker.style.fontFamily = 'Arial, sans-serif';
  marker.style.color = '#fff';
  marker.style.padding = '4px 6px';
  marker.style.lineHeight = '1';
  marker.textContent = `CLICK [${button.id || 'no-id'}]`;

  console.log('Marcador de clic activado en el botón Consultar del diálogo.', {
    id: button.id,
    name: button.getAttribute('name'),
    class: button.className,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  });
  return true;
}

export async function instructorResultsLoaded(): Promise<boolean> {
  const pageText = document.body.textContent?.toLocaleLowerCase() ?? '';
  const hasResultsTitle = pageText.includes('lista de usuarios sena');
  const hasResultRow = Array.from(document.querySelectorAll('table tbody tr'))
    .some((row) => row.getClientRects().length > 0 && row.textContent?.trim());
  return hasResultsTitle || hasResultRow;
}
