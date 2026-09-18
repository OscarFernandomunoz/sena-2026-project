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
  if (!identification) {
    console.log('❌ fillInstructorIdentification: No se proporcionó identificación');
    return false;
  }

  console.log('🎯 fillInstructorIdentification: CÉDULA A CONSULTAR:', identification);
  console.log('🔍 fillInstructorIdentification: Buscando input de identificación...');

  // Función auxiliar para verificar si un campo es de fecha
  const isDateField = (input: HTMLInputElement): boolean => {
    const text = [
      input.type,
      input.name,
      input.id,
      input.placeholder,
      input.getAttribute('aria-label') ?? '',
      input.parentElement?.textContent ?? '',
    ].join(' ').toLocaleLowerCase();
    return input.type === 'date' ||
      text.includes('fecha') ||
      text.includes('date') ||
      text.includes('inicio') ||
      text.includes('fin');
  };

  // Búsqueda más exhaustiva del input de identificación, excluyendo campos de fecha
  const allInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="number"]'))
    .filter(inp => !isDateField(inp)); // Excluir campos de fecha

  console.log('🔍 Total inputs encontrados (excluyendo fechas):', allInputs.length);

  allInputs.forEach((inp, index) => {
    console.log(`   [${index}] id="${inp.id}" name="${inp.name}" placeholder="${inp.placeholder || ''}" value="${inp.value}" visible=${inp.getClientRects().length > 0}`);
  });

  // Intentar encontrar por diferentes criterios
  // 1. Por ID específico (prioridad más alta)
  let input: HTMLInputElement | null = document.querySelector<HTMLInputElement>('input[id$="inputIdentificacion"]')
    ?? document.querySelector<HTMLInputElement>('input[id*="inputIdentificacion"]')
    ?? document.querySelector<HTMLInputElement>('input[id*="Identificacion"]')
    ?? document.querySelector<HTMLInputElement>('input[id*="identificacion"]');

  // Verificar que el encontrado no sea un campo de fecha
  if (input && isDateField(input)) {
    console.log('⚠️ fillInstructorIdentification: Input encontrado por ID pero es campo de fecha, ignorando...');
    input = null;
  }

  // 2. Por nombre
  if (!input) {
    input = document.querySelector<HTMLInputElement>('input[name*="identificacion"]')
      ?? document.querySelector<HTMLInputElement>('input[name*="Identificacion"]');

    if (input && isDateField(input)) {
      console.log('⚠️ fillInstructorIdentification: Input encontrado por nombre pero es campo de fecha, ignorando...');
      input = null;
    }
  }

  // 3. Por placeholder (solo si no contiene palabras de fecha)
  if (!input) {
    input = allInputs.find(inp => {
      const placeholder = inp.placeholder?.toLowerCase() || '';
      const hasIdKeywords = placeholder.includes('identificación') ||
        placeholder.includes('documento') ||
        placeholder.includes('cédula') ||
        placeholder.includes('numero') ||
        placeholder.includes('número');
      const hasDateKeywords = placeholder.includes('fecha') ||
        placeholder.includes('inicio') ||
        placeholder.includes('fin');
      return hasIdKeywords && !hasDateKeywords;
    }) ?? null;
  }

  // 4. Por el segundo input visible después del select de tipo de identificación
  if (!input) {
    const visibleInputs = allInputs.filter(inp => inp.getClientRects().length > 0);
    console.log('🔍 Inputs visibles (no fecha):', visibleInputs.length);

    // Buscar el input que está cerca del select de tipo de identificación
    const idTypeSelect = document.querySelector<HTMLSelectElement>('select[id$=":inputTipoIdentificacion"]')
      ?? document.querySelector<HTMLSelectElement>('select[id*="inputTipoIdentificacion"]');

    if (idTypeSelect && visibleInputs.length > 0) {
      // Encontrar el input más cercano al select
      const selectRect = idTypeSelect.getBoundingClientRect();
      input = visibleInputs.reduce((closest, current) => {
        const currentRect = current.getBoundingClientRect();
        const currentDist = Math.hypot(currentRect.left - selectRect.left, currentRect.top - selectRect.top);
        const closestRect = closest?.getBoundingClientRect();
        const closestDist = closestRect ? Math.hypot(closestRect.left - selectRect.left, closestRect.top - selectRect.top) : Infinity;
        return currentDist < closestDist ? current : closest;
      }, null as HTMLInputElement | null);
    } else if (visibleInputs.length >= 1) {
      // Fallback: primer input visible que no sea de fecha
      input = visibleInputs[0];
    }
  }

  if (!(input instanceof HTMLInputElement)) {
    console.log('❌ fillInstructorIdentification: No se encontró el input de identificación');
    return false;
  }

  // Verificación final de seguridad
  if (isDateField(input)) {
    console.log('❌ fillInstructorIdentification: El input encontrado parece ser un campo de fecha, abortando para evitar corruption de datos');
    return false;
  }

  console.log('✅ fillInstructorIdentification: Input encontrado. id=', input.id, 'name=', input.name);
  console.log('📝 Valor antes:', input.value);

  // Escribir el valor
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, identification);
  input.value = identification; // Doble aseguramiento
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.focus();

  console.log('📝 Valor después:', input.value);

  // Pequeño delay para que se pueda ver visualmente el número antes de continuar
  await new Promise(resolve => setTimeout(resolve, 1500));

  input.blur();
  const ok = input.value === identification || input.value === String(identification).replace(/\D/g, '');
  console.log(ok ? '✅ fillInstructorIdentification: Identificación escrita correctamente: ' + input.value : '❌ fillInstructorIdentification: No se pudo escribir, quedó=' + input.value);
  return ok;
}

// Busca y devuelve el botón Consultar del diálogo de instructor.
function findExactSearchButton(): HTMLElement | null {
  console.log('🔍 [BOTÓN] Buscando botón Consultar específico...');

  // Buscar específicamente el botón con ID terminando en :btnSearch y value="Consultar"
  const searchButton = document.querySelector<HTMLElement>(
    'input[type="submit"][id$=":btnSearch"][value="Consultar"], ' +
    'input[type="button"][id$=":btnSearch"][value="Consultar"], ' +
    'button[id$=":btnSearch"]'
  );

  if (searchButton) {
    const rect = searchButton.getBoundingClientRect();
    console.log('✅ [BOTÓN] Botón encontrado:');
    console.log(`   ID: ${searchButton.id}`);
    console.log(`   Name: ${searchButton.getAttribute('name')}`);
    console.log(`   Value: ${searchButton.getAttribute('value')}`);
    console.log(`   Class: ${searchButton.className}`);
    console.log(`   Ubicación: (${rect.left.toFixed(0)}, ${rect.top.toFixed(0)})`);
    console.log(`   Tamaño: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`);
    console.log(`   Visible: ${rect.width > 0 && rect.height > 0}`);

    // Scroll hacia el botón
    searchButton.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return searchButton;
  }

  console.log('❌ [BOTÓN] No se encontró el botón con ID terminando en :btnSearch y value="Consultar"');

  // Búsqueda alternativa: cualquier botón con value="Consultar"
  const consultarButtons = Array.from(document.querySelectorAll<HTMLElement>(
    'input[type="submit"][value="Consultar"], input[type="button"][value="Consultar"], button'
  )).filter(btn => {
    const text = (btn.textContent || '').trim().toLowerCase();
    return text === 'consultar';
  });

  console.log(`🔍 [BOTÓN] Botones alternativos con texto "Consultar": ${consultarButtons.length}`);

  if (consultarButtons.length > 0) {
    const button = consultarButtons[0];
    const rect = button.getBoundingClientRect();
    console.log('✅ [BOTÓN] Botón alternativo encontrado:');
    console.log(`   ID: ${button.id}`);
    console.log(`   Texto: ${button.textContent?.trim()}`);
    console.log(`   Ubicación: (${rect.left.toFixed(0)}, ${rect.top.toFixed(0)})`);

    button.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return button;
  }

  console.log('❌ [BOTÓN] No se encontró ningún botón "Consultar"');
  return null;
}

export async function clickInstructorSearchButton(): Promise<boolean> {
  const button = findExactSearchButton();
  if (!button || button.getClientRects().length === 0) {
    console.log('❌ clickInstructorSearchButton: No se encontró el botón Consultar o no es visible');
    return false;
  }

  console.log('✅ clickInstructorSearchButton: Botón encontrado, preparando click...');
  console.log(`   ID: ${button.id}`);
  console.log(`   Name: ${button.getAttribute('name')}`);
  console.log(`   Class: ${button.className}`);
  console.log(`   Value: ${button.getAttribute('value')}`);

  // Asegurar que el botón esté visible y scroll hacia él
  button.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Esperar un momento para que el scroll se complete
  await new Promise(resolve => setTimeout(resolve, 500));

  const rect = button.getBoundingClientRect();

  console.log('🎯 clickInstructorSearchButton: UBICACIÓN DEL BOTÓN ANTES DEL CLICK:');
  console.log(`   Coordenadas: (${rect.left.toFixed(0)}, ${rect.top.toFixed(0)})`);
  console.log(`   Tamaño: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`);
  console.log(`   Centro: (${(rect.left + rect.width / 2).toFixed(0)}, ${(rect.top + rect.height / 2).toFixed(0)})`);

  // Crear marcador visual para debug
  const root = document.body ?? document.documentElement;
  const markerId = '__sofiaClickDebugMarker__';
  let marker = document.getElementById(markerId) as HTMLDivElement | null;
  if (!marker) {
    marker = document.createElement('div');
    marker.id = markerId;
    root.appendChild(marker);
  }

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

  console.log('🎯 clickInstructorSearchButton: Ejecutando click en el botón...');

  // Ejecutar el click real
  try {
    button.click();
    console.log('✅ clickInstructorSearchButton: Click ejecutado exitosamente');
    console.log(`📍 UBICACIÓN DEL CLICK: (${(rect.left + rect.width / 2).toFixed(0)}, ${(rect.top + rect.height / 2).toFixed(0)})`);

    // Disparar eventos adicionales para asegurar que el onclick se ejecute
    button.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    button.dispatchEvent(new Event('mousedown', { bubbles: true }));
    button.dispatchEvent(new Event('mouseup', { bubbles: true }));

    return true;
  } catch (error) {
    console.log('❌ clickInstructorSearchButton: Error al ejecutar click:', error);
    return false;
  }
}

export async function instructorResultsLoaded(): Promise<boolean> {
  const pageText = document.body.textContent?.toLocaleLowerCase() ?? '';
  const hasResultsTitle = pageText.includes('lista de usuarios sena');
  const hasResultRow = Array.from(document.querySelectorAll('table tbody tr'))
    .some((row) => row.getClientRects().length > 0 && row.textContent?.trim());
  return hasResultsTitle || hasResultRow;
}
