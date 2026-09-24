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

// Escribe la primera identificación del archivo en el campo del diálogo de instructor.
export async function fillInstructorIdentification(identification: string): Promise<boolean> {
  if (!identification) {
    console.error('[Reporte] No se recibió una identificación para la consulta.');
    return false;
  }

  console.log('[Reporte] Iniciando la búsqueda del campo de identificación.');
  console.log('[Reporte] Se recibió una identificación para consultar.');

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

  console.log('[Reporte] Campos de entrada disponibles, sin campos de fecha:', allInputs.length);

  allInputs.forEach((inp, index) => {
    console.log(`[Reporte] Campo ${index}: id="${inp.id}", name="${inp.name}", placeholder="${inp.placeholder || ''}", visible=${inp.getClientRects().length > 0}`);
  });

  // Intentar encontrar por diferentes criterios
  // 1. Por ID específico (prioridad más alta)
  let input: HTMLInputElement | null = document.querySelector<HTMLInputElement>('input[id$="inputIdentificacion"]')
    ?? document.querySelector<HTMLInputElement>('input[id*="inputIdentificacion"]')
    ?? document.querySelector<HTMLInputElement>('input[id*="Identificacion"]')
    ?? document.querySelector<HTMLInputElement>('input[id*="identificacion"]');

  // Verificar que el encontrado no sea un campo de fecha
  if (input && isDateField(input)) {
    console.warn('[Reporte] El campo encontrado por ID corresponde a una fecha y fue ignorado.');
    input = null;
  }

  // 2. Por nombre
  if (!input) {
    input = document.querySelector<HTMLInputElement>('input[name*="identificacion"]')
      ?? document.querySelector<HTMLInputElement>('input[name*="Identificacion"]');

    if (input && isDateField(input)) {
      console.warn('[Reporte] El campo encontrado por nombre corresponde a una fecha y fue ignorado.');
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
    console.log('[Reporte] Campos visibles disponibles, sin campos de fecha:', visibleInputs.length);

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
    console.error('[Reporte] No se encontró el campo de identificación del instructor.');
    return false;
  }

  // Verificación final de seguridad
  if (isDateField(input)) {
    console.error('[Reporte] El campo seleccionado parece ser un campo de fecha; la operación se canceló para evitar datos incorrectos.');
    return false;
  }

  console.log(`[Reporte] Campo de identificación encontrado (id="${input.id}", name="${input.name}").`);
  console.log('[Reporte] Preparando el campo para escribir la identificación.');

  // Escribir el valor
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, identification);
  input.value = identification; // Doble aseguramiento
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.focus();

  console.log('[Reporte] La identificación fue enviada al campo seleccionado.');

  // Pequeño delay para que se pueda ver visualmente el número antes de continuar
  await new Promise(resolve => setTimeout(resolve, 1500));

  input.blur();
  const ok = input.value === identification || input.value === String(identification).replace(/\D/g, '');
  if (ok) {
    console.log('[Reporte] La identificación se escribió correctamente en el campo.');
  } else {
    console.error('[Reporte] No se pudo escribir la identificación en el campo seleccionado.');
  }
  return ok;
}

// Localiza y pulsa el input "Consultar" mostrado en la captura del diálogo del
// instructor. El input tiene type="submit", por lo que HTMLElement.click() ejecuta
// su acción JSF sin depender de unas coordenadas globales que podrían ser incorrectas.
//
// El selector real cambia de prefijo JSF en cada ejecución, pero conserva un ID que
// termina en ":btnSearch" y las clases btn btn-info btn-block.
//
// ⚠️ Las funciones auxiliares quedan dentro porque index.ts serializa esta función con
// .toString() y la ejecuta directamente en la página de SofiaPlus.
export function clickInstructorSearchInput(): boolean {
  // El objetivo de DevTools es específicamente un <input>, no cualquier botón o enlace
  // cuyo texto sea "Consultar". El prefijo JSF cambia, pero el sufijo permanece estable.
  const SEARCH_INPUT_SELECTOR =
    'input[id$=":jbtnSearch"], input[id$=":btnSearch"], input[value="Consultar"]';

  // Normaliza texto (minúsculas, sin acentos, sin espacios sobrantes) para poder comparar.
  const normalizeText = (value: string | null | undefined): string => (value ?? '')
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Un control sirve únicamente si está visible y habilitado.
  const isUsable = (control: HTMLElement): boolean =>
    control.getClientRects().length > 0 && !control.hasAttribute('disabled');

  // Solo puntúa el input cuyo ID tiene el sufijo mostrado en DevTools. Un input adicional
  // con value="Consultar" solo sirve para diagnóstico, nunca para ser elegido.
  const searchScore = (control: HTMLElement): number => {
    const id = normalizeText(control.id);
    const matchesCapturedId = id.endsWith(':jbtnsearch') || id.endsWith(':btnsearch');
    if (!matchesCapturedId) return 0;

    const matchesCapturedClasses = control.matches('input.btn.btn-info.btn-block');
    return matchesCapturedClasses ? 130 : 100;
  };

  // Distancia entre el control y el input de identificación; sirve de desempate para
  // quedarnos con el Consultar del mismo diálogo y no con otro de la página.
  const distanceToIdentificationField = (control: HTMLElement): number => {
    const field = document.querySelector<HTMLElement>('input[id*="Identificacion"], input[id*="identificacion"]');
    if (!field) return 0;
    const controlRect = control.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    return Math.hypot(controlRect.left - fieldRect.left, controlRect.top - fieldRect.top);
  };

  // Busca y devuelve el botón Consultar del diálogo de instructor.
  const findInstructorSearchInput = (): HTMLElement | null => {
    console.log('[Reporte] Buscando el control Consultar del instructor.');

    // El input señalado por DevTools se incluye aunque el sitio no declare explícitamente
    // type="submit"/"button". El ID JSF es dinámico, pero el sufijo :jbtnSearch no cambia.
    const controls = Array.from(document.querySelectorAll<HTMLInputElement>(SEARCH_INPUT_SELECTOR));
    const visible = controls.filter(isUsable);

    const rank = (items: HTMLElement[]): { control: HTMLElement; score: number }[] => items
      .map((control) => ({ control, score: searchScore(control) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score
        || distanceToIdentificationField(a.control) - distanceToIdentificationField(b.control));

    // Solo se inspeccionan controles visibles. Si no está el input en este frame,
    // executeInFrames continúa con los demás frames y ventanas emergentes del sitio.
    // Nunca se selecciona el control oculto, porque eso fue precisamente el origen de que
    // se seleccionara un control que no era el de la captura.
    const candidates = rank(visible);

    console.log(
      `[Reporte] Controles Consultar: ${controls.length}; visibles: ${visible.length}; candidatos: ${candidates.length}; frame: ${location.pathname}`,
    );

    // Lista los candidatos rankeados (id, etiqueta y puntaje) para ver exactamente
    // cuál se eligió y por qué el elegido no tenía id.
    if (candidates.length > 0) {
      console.log('[Reporte] Candidatos del control Consultar, ordenados por prioridad.');
      candidates.slice(0, 8).forEach((entry, index) => {
        const element = entry.control as HTMLInputElement;
        const label = element.value || element.textContent?.trim() || '';
        console.log(
          `[Reporte] Candidato ${index}: score=${entry.score}, tipo=${element.tagName.toLowerCase()}, ` +
          `id="${element.id || '(sin id)'}", texto="${String(label).slice(0, 40)}", ` +
          `visible=${isUsable(element)}`,
        );
      });
    }

    const best = candidates[0]?.control;
    if (!best) {
      // Depuración: lista TODOS los botones de formulario del documento (visibles y ocultos)
      // para saber qué hay en pantalla y por qué no coincidi ninguno.
      console.warn('[Reporte] No se encontró un control Consultar visible. Controles inspeccionados:');
      controls.filter((control) => control.matches('input, button')).forEach((control) => {
        const input = control as HTMLInputElement;
        console.log(
          `[Reporte] Control inspeccionado: id="${control.id}", type="${input.type ?? ''}", ` +
          `value="${input.value ?? ''}", texto="${control.textContent?.trim() ?? ''}", ` +
          `visible=${isUsable(control)}, disabled=${control.hasAttribute('disabled')}`,
        );
      });
      return null;
    }

    const rect = best.getBoundingClientRect();
    const input = best as HTMLInputElement;
    // JSON.stringify en el propio texto: los objetos que se pasan como segundo argumento
    // de console.log llegan a la consola de la app como "[object Object]".
    console.log(
      `[Reporte] Control Consultar seleccionado: ${JSON.stringify({
        id: best.id || '(sin id)',
        etiqueta: String(input.value || best.textContent?.trim() || ''),
        tipo: input.type ?? best.tagName,
        visible: isUsable(best),
        posicion: `(${rect.left.toFixed(0)}, ${rect.top.toFixed(0)})`,
        tamano: `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`,
        coincidencias: candidates.length,
        frame: location.pathname,
      })}`,
    );

    return best;
  };

  const searchInput = findInstructorSearchInput();
  if (!searchInput) {
    console.error('[Reporte] No se encontró el control Consultar requerido.');
    return false;
  }

  // Se conserva la posición local para diagnóstico. El click NO se hace con esas
  // coordenadas: se ejecuta sobre el elemento exacto dentro del frame donde fue encontrado.
  const rect = searchInput.getBoundingClientRect();
  const input = searchInput as HTMLInputElement;
  const target = {
    id: searchInput.id || '(sin id)',
    type: input.type,
    value: input.value,
    clases: searchInput.className,
    visible: isUsable(searchInput),
    esquinaSuperiorIzquierdaLocal: [Math.round(rect.left), Math.round(rect.top)],
    centroLocal: [Math.round(rect.left + (rect.width / 2)), Math.round(rect.top + (rect.height / 2))],
    tamano: [Math.round(rect.width), Math.round(rect.height)],
    frame: location.pathname,
  };
  console.log(`[Reporte] Control Consultar seleccionado: ${JSON.stringify(target)}`);

  try {
    // type="submit" responde a la secuencia estándar de ratón y luego a un único click.
    // Al ejecutar click() sobre este input, el navegador hace el submit JSF correcto.
    searchInput.focus();
    const eventOptions: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0,
      detail: 1,
    };
    searchInput.dispatchEvent(new MouseEvent('mousedown', eventOptions));
    searchInput.dispatchEvent(new MouseEvent('mouseup', eventOptions));
    searchInput.click();

    console.log(`[Reporte] Se envió la activación del control Consultar (id="${searchInput.id}").`);
    return true;
  } catch (error) {
    console.error('[Reporte] No se pudo activar el control Consultar.', error);
    return false;
  }
}

// Espera dentro del flujo y pulsa el enlace exacto generado por la consulta.
// Usa getElementById porque el ID contiene varios dos puntos y necesitaría
// escaping especial si se usara como selector CSS.
export function clickInstructorResultLink(): boolean {
  const targetId = 'frmFuncionario:dtFuncionario:0:cmdlnkShow';
  const link = document.getElementById(targetId);

  if (!(link instanceof HTMLAnchorElement) || link.getClientRects().length === 0) return false;

  const rect = link.getBoundingClientRect();
  const handler = link.getAttribute('onclick') ?? '';
  console.log(`[Reporte] Enlace del instructor encontrado: ${JSON.stringify({
    id: link.id,
    texto: link.textContent?.trim() ?? '',
    href: link.getAttribute('href') ?? '',
    onclick: handler,
    visible: true,
    posicionLocal: [Math.round(rect.left), Math.round(rect.top)],
    frame: location.pathname,
  })}`);

  const argumentMatch = handler.match(/enviarParametro\s*\(\s*(['"])([\s\S]*?)\1\s*,\s*(['"])([\s\S]*?)\3\s*\)/);
  const decodeArgument = (value: string): string => value
    .replace(/\\(['"\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r');

  type PopupContext = {
    owner: Window;
    form: HTMLFormElement;
    fieldName: string;
    firstValue: string;
    secondValue: string;
  };
  type ModalController = {
    _myfaces_ok?: boolean;
    hide?: () => void;
  };

  const getTargetForm = (documentRef: Document, formName: string): HTMLFormElement | undefined => {
    const forms = documentRef.forms;
    const numericIndex = Number(formName);
    if (Number.isInteger(numericIndex) && numericIndex >= 0) {
      const indexedForm = forms[numericIndex];
      if (indexedForm) return indexedForm;
    }

    return Array.from(forms).find((form) => form.name === formName || form.id === formName);
  };

  const findPopupContext = (): PopupContext | undefined => {
    if (!argumentMatch) return undefined;

    const firstValue = decodeArgument(argumentMatch[2] ?? '');
    const secondValue = decodeArgument(argumentMatch[4] ?? '');
    const candidateWindows: Window[] = [];
    const visitedWindows = new Set<Window>();
    const collectWindows = (candidate: Window | null | undefined): void => {
      if (!candidate || visitedWindows.has(candidate)) return;
      visitedWindows.add(candidate);
      candidateWindows.push(candidate);

      try {
        for (let index = 0; index < candidate.frames.length; index += 1) {
          collectWindows(candidate.frames[index]);
        }
      } catch {
        // Una ventana de otro origen puede impedir inspeccionar sus frames.
      }
    };

    // El portal espera encontrar el formulario en window.parent; se incluye
    // el opener y los frames porque Electron puede separar el popup en otra ventana.
    collectWindows(window.parent);
    collectWindows(window.opener);
    collectWindows(window);

    for (const candidate of candidateWindows) {
      let forms: HTMLFormElement[];
      try {
        forms = Array.from(candidate.document.forms);
      } catch {
        continue;
      }

      for (const markerForm of forms) {
        const marker = markerForm.elements.namedItem('valorCampo') as HTMLInputElement | null;
        const rawValue = marker?.value;
        if (!rawValue) continue;

        const [formName, fieldName] = rawValue.split(':');
        if (!formName || !fieldName) continue;
        const targetForm = getTargetForm(candidate.document, formName);
        if (!targetForm) continue;

        return { owner: candidate, form: targetForm, fieldName, firstValue, secondValue };
      }
    }

    return undefined;
  };

  try {
    if (argumentMatch) {
      const popupContext = findPopupContext();
      if (!popupContext) {
        const warningWindow = window as Window & { __sofiaPopupContextWarning?: boolean };
        if (!warningWindow.__sofiaPopupContextWarning) {
          console.warn('[Reporte] No se encontró el formulario destino del popup; se reintentará sin ejecutar el manejador incompatible.');
          warningWindow.__sofiaPopupContextWarning = true;
        }
        return false;
      }

      const elements = popupContext.form.elements;
      for (let index = 0; index < elements.length; index += 1) {
        const element = elements[index] as HTMLInputElement;
        if (element.id === popupContext.fieldName) element.value = popupContext.firstValue;
        if (element.id === `hi_${popupContext.fieldName}`) element.value = popupContext.secondValue;
        if (element.id === `hi_tx_${popupContext.fieldName}`) element.value = popupContext.firstValue;
      }

      let modalOwner: Window | null = popupContext.owner;
      while (modalOwner) {
        const modalHost = modalOwner as Window & { _myfaces_currentModal?: ModalController };
        const modal = modalHost._myfaces_currentModal;
        if (modal?.hide) {
          modal._myfaces_ok = true;
          modal.hide();
          break;
        }
        if (modalOwner.parent === modalOwner) break;
        modalOwner = modalOwner.parent;
      }

      // Si el portal usa una ventana emergente real, el modal no tiene hide().
      if (window.opener && window.opener !== window) window.close();

      console.log('[Reporte] Se actualizó el formulario del instructor mediante el contexto del popup.');
      return true;
    }

    const eventOptions: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0,
      detail: 1,
    };
    link.dispatchEvent(new MouseEvent('mousedown', eventOptions));
    link.dispatchEvent(new MouseEvent('mouseup', eventOptions));
    link.click();

    console.log(`[Reporte] Se envió la activación del enlace del instructor (id="${targetId}").`);
    return true;
  } catch (error) {
    console.error('[Reporte] No se pudo activar el enlace del instructor.', error);
    return false;
  }
}
