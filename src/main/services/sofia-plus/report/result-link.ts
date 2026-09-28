// Selecciona al instructor a partir del enlace devuelto por la consulta.
//
// El portal resuelve la selección con un manejador inline (`enviarParametro`, en
// sofiaPopUp.js) que busca un formulario en la ventana que abrió el diálogo. En Electron
// esa búsqueda devuelve `undefined` y el manejador revienta con
// "Cannot read properties of undefined (reading 'elements')", aunque en un Chrome normal
// funcione: la diferencia es el entorno, no el código del portal.
//
// Aquí ese manejador NUNCA se invoca. Se resuelve el formulario destino, se escriben los
// valores y se envía el formulario, replicando lo que el portal pretendía hacer.
//
// ⚠️ Esta función se serializa con `.toString()` y se ejecuta dentro de la página de
// SofiaPlus. NO puede referenciar imports, constantes de módulo ni helpers externos: todos
// los auxiliares van dentro del propio cuerpo.

export function clickInstructorResultLink(): boolean {
  // El id esperado incluye el índice de la fila (":0:"), así que con varias filas puede no
  // coincidir. Se acepta el id exacto y, como respaldo, cualquier enlace de comando del
  // diálogo: el sufijo cmdlnkShow es el que genera el portal para "ver ficha del funcionario".
  const findLink = (): HTMLAnchorElement | null => {
    const exact = document.getElementById('frmFuncionario:dtFuncionario:0:cmdlnkShow');
    if (exact instanceof HTMLAnchorElement) return exact;
    const alternatives = Array.from(document.querySelectorAll<HTMLAnchorElement>(
      'a[id$=":cmdlnkShow"], a[id*="cmdlnkShow"], a.cmdLink[id], a[id$=":cmdlnk"]',
    ));
    return alternatives.find((anchor) => anchor.getClientRects().length > 0) ?? alternatives[0] ?? null;
  };

  const link = findLink();
  if (!(link instanceof HTMLAnchorElement)) return false;
  // Se registra aunque el enlace no sea visible: es el caso en el que el diálogo se renderizó
  // pero quedó tapado por un overlay de blockUI, y antes el flujo solo devolvía false en silencio.
  console.log(`[Reporte] Enlace del instructor: ${JSON.stringify({
    id: link.id,
    texto: link.textContent?.trim() ?? '',
    href: link.getAttribute('href') ?? '',
    onclick: link.getAttribute('onclick') ?? '',
    visible: link.getClientRects().length > 0,
    frame: location.pathname,
  })}`);

  if (link.getClientRects().length === 0) return false;

  const handler = link.getAttribute('onclick') ?? '';

  // Secuencia de ratón que espera un input[type=submit] de JSF.
  const activate = (target: HTMLElement): void => {
    const options: MouseEventInit = { bubbles: true, cancelable: true, view: window, button: 0, detail: 1 };
    target.dispatchEvent(new MouseEvent('mousedown', options));
    target.dispatchEvent(new MouseEvent('mouseup', options));
    target.click();
  };

  // Sin manejador inline el clic del navegador es seguro: no hay código del portal que reventar.
  if (!handler.trim()) {
    activate(link);
    return true;
  }

  // El manejador se interpreta sin asumir su firma: cualquier número de argumentos, prefijos
  // del tipo window.parent.enviarParametro y comas dentro de las cadenas. Solo interesan las
  // cadenas literales, en orden. El patrón anterior exigía exactamente dos argumentos string
  // seguidos de ")" y, al no coincidir, delegaba el clic en el manejador roto del portal.
  const readCall = (source: string): { name: string; args: string[] } | null => {
    const call = /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\(/.exec(source);
    const name = (call?.[1] ?? '').split('.').pop() ?? '';
    if (!call || !name) return null;

    const args: string[] = [];
    let depth = 0;
    let quote = '';
    let literal = '';
    for (let i = call[0].length - 1; i < source.length; i += 1) {
      const char = source[i] ?? '';
      if (quote) {
        if (char === '\\') { literal += source[i + 1] ?? ''; i += 1; continue; }
        if (char === quote) { args.push(literal); literal = ''; quote = ''; continue; }
        literal += char;
        continue;
      }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === '(') { depth += 1; continue; }
      if (char === ')') { depth -= 1; if (depth === 0) break; }
    }
    return { name, args };
  };

  const call = readCall(handler);
  if (!call) {
    console.warn('[Reporte] El onclick no contiene ninguna llamada reconocible; no se hace clic para no ejecutar un manejador desconocido.');
    return false;
  }
  console.log(`[Reporte] Manejador reconocido: ${call.name}(${call.args.length} args) -> ${JSON.stringify(call.args)}`);

  // El formulario puede vivir en el documento propio, en un frame, en el opener o en la
  // cadena de padres, según cómo el portal montara el diálogo. Se recorren todos.
  const reachableWindows = (): Window[] => {
    const found: Window[] = [];
    const seen = new Set<Window>();
    const collect = (candidate: Window | null | undefined): void => {
      if (!candidate || seen.has(candidate)) return;
      seen.add(candidate);
      found.push(candidate);
      try {
        for (let i = 0; i < candidate.frames.length; i += 1) collect(candidate.frames[i]);
      } catch {
        // Una ventana de otro origen puede impedir inspeccionar sus frames.
      }
    };
    collect(window);
    collect(window.parent);
    collect(window.opener);
    collect(window.top);
    return found;
  };

  const windows = reachableWindows();
  const candidates: { owner: Window; form: HTMLFormElement }[] = [];
  for (const candidate of windows) {
    let forms: HTMLFormElement[];
    try { forms = Array.from(candidate.document.forms); } catch { continue; }
    for (const form of forms) candidates.push({ owner: candidate, form });
  }
  console.log(`[Reporte] Ventanas alcanzables: ${windows.length}; formularios: ${candidates.length}.`);

  // El portal marca el formulario con un hidden `valorCampo` = "formulario:campo".
  let fieldName = '';
  let target: HTMLFormElement | null = null;
  for (const entry of candidates) {
    const marker = entry.form.elements.namedItem('valorCampo') as HTMLInputElement | null;
    const raw = marker?.value ?? '';
    const separator = raw.indexOf(':');
    if (separator <= 0) continue;
    fieldName = raw.slice(separator + 1);
    target = entry.form;
    break;
  }

  // Alternativa: el propio manejador nombra el campo destino.
  if (!target) {
    for (const value of call.args) {
      const owner = candidates.find((entry) => entry.form.elements.namedItem(value));
      if (owner) { target = owner.form; fieldName = value; break; }
    }
  }

  if (!(target instanceof HTMLFormElement) || !fieldName) {
    console.warn('[Reporte] No se encontró el formulario destino; se reintentará en el siguiente intento.');
    return false;
  }

  const [first, second] = call.args;
  if (first === undefined) {
    console.warn('[Reporte] El manejador no pasó ninguna cadena literal; no hay valor que asignar.');
    return false;
  }

  // Se escribe el campo y sus compañeros ocultos, que es lo que JSF lee al enviar el formulario.
  const elements = target.elements;
  for (let i = 0; i < elements.length; i += 1) {
    const element = elements[i] as HTMLInputElement;
    if (element.id === fieldName || element.name === fieldName) element.value = first;
    if (element.id === `hi_${fieldName}`) element.value = second ?? first;
    if (element.id === `hi_tx_${fieldName}`) element.value = first;
  }
  console.log(`[Reporte] Instructor escrito en "${fieldName}" de "${target.name || target.id || '(sin nombre)'}".`);

  // Enviar el formulario es lo que realmente completa la selección; antes solo se escribían
  // los valores y se cerraba el diálogo, así que la consulta nunca avanzaba.
  try {
    if (typeof target.requestSubmit === 'function') target.requestSubmit();
    else target.submit();
    console.log('[Reporte] Formulario enviado sin invocar el manejador del portal.');
    return true;
  } catch (error) {
    console.error('[Reporte] No se pudo enviar el formulario del instructor.', error);
    return false;
  }
}
