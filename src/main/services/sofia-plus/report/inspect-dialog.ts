// Diagnóstico del diálogo de instructor. Se ejecuta UNA sola vez, cuando el paso 11 ya falló,
// y devuelve un volcado del frame para averiguar por qué el enlace del instructor no aparece.
//
// Hasta ahora esa información no existía: clickInstructorResultLink devolvía false en silencio
// y no había forma de distinguir entre "el diálogo no renderizó la tabla", "la tabla salió
// vacía" y "el enlace existe pero está tapado por un overlay de blockUI".
//
// ⚠️ Esta función se serializa con `.toString()` y se ejecuta dentro de la página de
// SofiaPlus. NO puede referenciar imports, constantes de módulo ni helpers externos.

export function inspectInstructorDialog(): string {
  const limit = 12;
  const text = (node: Element | null, max = 60): string => (node?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

  const tables = Array.from(document.querySelectorAll('table')).map((table) => ({
    id: table.id,
    headers: Array.from(table.querySelectorAll('th')).slice(0, limit).map((cell) => text(cell, 24)),
    rows: table.rows.length,
    visibles: Array.from(table.rows).filter((row) => row.getClientRects().length > 0).length,
  }));

  const enlaces = Array.from(document.querySelectorAll('a')).map((anchor) => ({
    id: anchor.id,
    texto: text(anchor, 40),
    visible: anchor.getClientRects().length > 0,
    onclick: (anchor.getAttribute('onclick') ?? '').slice(0, 90),
  })).filter((anchor) => anchor.id || anchor.onclick);

  // El overlay de blockUI es la causa habitual de un enlace que existe pero no es visible.
  const overlay = document.querySelector('.ui-widget-overlay, .blockUI, .blockmsg');
  const jQuery = typeof (window as Window & { jQuery?: unknown }).jQuery === 'object'
    || typeof (window as Window & { $?: unknown }).$ === 'object';

  return JSON.stringify({
    frame: location.pathname,
    titulo: text(document.querySelector('h1, h2, h3, legend'), 80),
    // Texto visible recortado: delata avisos del portal como "no se encontraron resultados".
    textoVisible: text(document.body, 400),
    formularios: Array.from(document.forms).map((form) => form.name || form.id || '(sin nombre)'),
    inputs: Array.from(document.querySelectorAll('input, select')).slice(0, limit).map((input) => ({
      id: (input as HTMLElement).id,
      type: (input as HTMLInputElement).type,
      valor: ((input as HTMLInputElement).value ?? '').slice(0, 40),
    })),
    tablas: tables,
    enlaces: enlaces.slice(0, limit),
    totalEnlaces: enlaces.length,
    overlayActivo: Boolean(overlay),
    jQueryPresente: jQuery,
    bodyVisible: document.body ? document.body.getClientRects().length > 0 : false,
  });
}
