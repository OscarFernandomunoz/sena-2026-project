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
  if (!option) {
    console.log('❌ selectCitizenshipId: La opción requerida no existe.');
    return false;
  }
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
      const placeholder = inp.placeholder.toLowerCase();
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
    } else {
      // Fallback: primer input visible que no sea de fecha
      input = visibleInputs[0] ?? null;
    }
  }

  if (!(input instanceof HTMLInputElement)) {
    console.log('❌ fillInstructorIdentification: No se encontró el input de identificación');
    return false;
  }

  // Verificación final de seguridad
  if (isDateField(input)) {
    console.log('❌ fillInstructorIdentification: El input encontrado parece ser un campo de fecha, abortando para evitar corrupción de datos');
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

// Normaliza texto (minúsculas, sin acentos, sin espacios sobrantes) para poder comparar.
function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Solo los controles que realmente pueden disparar la consulta.
const CLICKABLE_SELECTOR =
  'input[type="submit"], input[type="button"], input[type="image"], input[type="reset"], button, a, [role="button"], [onclick]';

// Un control sirve únicamente si está visible y habilitado.
function isUsable(control: HTMLElement): boolean {
  return control.getClientRects().length > 0 && !control.hasAttribute('disabled');
}

// Devuelve todos los textos comparables de un control.
// IMPORTANTE: en un <input> el texto visible vive en `value`, NO en textContent
// (textContent siempre es ""), por eso el filtro anterior jamás hallaba un input.
function controlText(control: HTMLElement): string {
  const input = control as HTMLInputElement;
  return normalizeText([
    control.textContent ?? '',
    input.value ?? '',
    control.getAttribute('value') ?? '',
    control.id,
    control.getAttribute('name') ?? '',
    control.getAttribute('title') ?? '',
    control.getAttribute('aria-label') ?? '',
  ].join(' '));
}

// Puntúa qué tan probable es que ese control sea el botón Consultar del diálogo.
// 100 = id con forma de btnSearch, 80 = etiqueta exacta "Consultar", 60 = contiene la palabra.
function searchScore(control: HTMLElement): number {
  const id = normalizeText(control.id);
  const label = normalizeText(control.textContent);
  const value = normalizeText((control as HTMLInputElement).value) || normalizeText(control.getAttribute('value'));
  if (id === 'btnsearch' || id.endsWith(':btnsearch')) return 100;
  if (id.includes('btnsearch')) return 90;
  if (label === 'consultar' || value === 'consultar') return 80;
  if (controlText(control).includes('consultar')) return 60;
  return 0;
}

// Distancia entre el control y el input de identificación; sirve de desempate para
// quedarnos con el Consultar del mismo diálogo y no con otro de la página.
function distanceToIdentificationField(control: HTMLElement): number {
  const field = document.querySelector<HTMLElement>('input[id*="Identificacion"], input[id*="identificacion"]');
  if (!field) return 0;
  const controlRect = control.getBoundingClientRect();
  const fieldRect = field.getBoundingClientRect();
  return Math.hypot(controlRect.left - fieldRect.left, controlRect.top - fieldRect.top);
}

// Busca y devuelve el botón Consultar del diálogo de instructor.
function findExactSearchButton(): HTMLElement | null {
  console.log('🔍 [BOTÓN] Buscando botón Consultar...');

  const controls = Array.from(document.querySelectorAll<HTMLElement>(CLICKABLE_SELECTOR));
  const visible = controls.filter(isUsable);

  // Primero se busca entre los controles visibles. Si no hay ninguno (el diálogo puede
  // estar oculto o con una animación en curso) se usa cualquiera no deshabilitado:
  // un .click() sobre un elemento oculto también dispara su onclick.
  const pool = visible.length > 0 ? visible : controls.filter((control) => !control.hasAttribute('disabled'));
  if (visible.length === 0 && pool.length > 0) {
    console.warn(`⚠️ [BOTÓN] Ningún candidato visible; se intentará con ${pool.length} control(es) oculto(s).`);
  }

  const candidates = pool
    .map((control) => ({ control, score: searchScore(control) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score
      || distanceToIdentificationField(a.control) - distanceToIdentificationField(b.control));

  console.log(`🔍 [BOTÓN] Controles: ${controls.length} | visibles: ${visible.length} | candidatos: ${candidates.length}`);

  const best = candidates[0]?.control;
  if (!best) {
    // Depuración: lista TODOS los botones de formulario del documento (visibles y ocultos)
    // para saber qué hay en pantalla y por qué no coincidi ninguno.
    console.log('❌ [BOTÓN] Ningún candidato. Botones de formulario presentes:');
    controls.filter((control) => control.matches('input, button')).forEach((control) => {
      const input = control as HTMLInputElement;
      console.log(
        `   id="${control.id}" type="${input.type ?? ''}" value="${input.value ?? ''}" ` +
        `texto="${control.textContent?.trim() ?? ''}" visible=${isUsable(control)} ` +
        `disabled=${control.hasAttribute('disabled')}`,
      );
    });
    return null;
  }

  const rect = best.getBoundingClientRect();
  const input = best as HTMLInputElement;
  console.log('✅ [BOTÓN] Botón Consultar encontrado:', {
    id: best.id || '(sin id)',
    tipo: input.type ?? best.tagName,
    valor: input.value || best.textContent?.trim(),
    visible: isUsable(best),
    posicion: `(${rect.left.toFixed(0)}, ${rect.top.toFixed(0)})`,
    tamano: `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`,
    coincidencias: candidates.length,
  });

  best.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return best;
}

export async function clickInstructorSearchButton(): Promise<boolean> {
  const button = findExactSearchButton();
  if (!button) {
    console.log('❌ clickInstructorSearchButton: No se encontró el botón Consultar o no es visible');
    return false;
  }

  // Scroll hacia el botón y espera a que termine para tener coordenadas reales.
  button.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await new Promise((resolve) => setTimeout(resolve, 500));

  const rect = button.getBoundingClientRect();
  console.log(
    `🎯 clickInstructorSearchButton: Click en id="${button.id || 'no-id'}" ` +
    `centro=(${(rect.left + rect.width / 2).toFixed(0)}, ${(rect.top + rect.height / 2).toFixed(0)})`,
  );

  try {
    // Secuencia de ratón previa: algunos manejadores (jQuery/PrimeFaces) solo reaccionan
    // si antes hubo mousedown/mouseup sobre el control.
    const eventOptions: MouseEventInit = { bubbles: true, cancelable: true, view: window, button: 0, detail: 1 };
    button.dispatchEvent(new MouseEvent('mousedown', eventOptions));
    button.dispatchEvent(new MouseEvent('mouseup', eventOptions));

    // UN solo click: antes se disparaba además un evento 'click' sintético y el
    // formulario JSF se enviaba dos veces.
    button.click();
    console.log('✅ clickInstructorSearchButton: Click ejecutado');
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
