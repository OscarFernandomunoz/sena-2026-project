// Pulsa el enlace del instructor devuelto por la consulta.
//
// El portal resuelve la selección con dos handlers en el onclick del enlace:
// 1. enviarParametro(nombre, id): lee window.parent.document.forms[0].valorCampo.value
//    para saber QUÉ campo del formulario padre recibirá el dato, y escribe los hidden de
//    ese campo (valor4 / hi_valor4). Si valorCampo está vacío, estalla en sofiaPopUp.js
//    con "Cannot read properties of undefined (reading 'elements')".
// 2. oamSubmitForm('frmInstructor', linkId): envía el formulario de resultados.
//
// En Electron valorCampo llega vacío (abrir el modal no lo deja sembrado), así que antes
// de pulsar el enlace lo sembramos nosotros con el mismo valor que el navegador usa:
// "<idDelFormulario>:valor4" — exactamente lo que produce el navegador al abrir el modal.
//
// ⚠️ Esta función se serializa con `.toString()` y se ejecuta dentro de la página de
// SofiaPlus. NO puede referenciar imports, constantes de módulo ni helpers externos: todos
// los auxiliares van dentro del propio cuerpo.

export function clickInstructorResultLink(): boolean {
  const findLink = (): HTMLAnchorElement | null => {
    const exact = document.getElementById('frmFuncionario:dtFuncionario:0:cmdlnkShow');
    if (exact instanceof HTMLAnchorElement) return exact;
    const alternatives = Array.from(document.querySelectorAll<HTMLAnchorElement>(
      'a[id$=":cmdlnkShow"], a[id*="cmdlnkShow"]',
    ));
    return alternatives.find((anchor) => anchor.getClientRects().length > 0) ?? alternatives[0] ?? null;
  };

  // Siembra window.parent...valorCampo con el par de hidden esperado, OMITE si ya viene
  // (en un navegador normal no tocaría nada) y OMITE si el form destino no tiene el
  // par de hidden; en ese caso dejamos el valor actual.
  const seedValorCampo = (): void => {
    try {
      const parentDoc = window.parent && window.parent !== window ? window.parent.document : window.document;
      for (const form of Array.from(parentDoc.forms)) {
        const valorCampo = form.elements.namedItem('valorCampo') as HTMLInputElement | null;
        const valor4 = form.elements.namedItem('valor4') as HTMLInputElement | null;
        if (!valorCampo || !valor4) continue;
        if (!valorCampo.value.trim()) {
          valorCampo.value = `${form.id || form.name}:valor4`;
          console.log(`[Reporte] valorCampo sembrado como "${valorCampo.value}" en form "${form.id || form.name}".`);
        } else {
          console.log(`[Reporte] valorCampo ya venía con "${valorCampo.value}". No se modifica.`);
        }
        return;
      }
      console.warn('[Reporte] No se encontró el form padre con los hidden valorCampo/valor4.');
    } catch (error) {
      console.error('[Reporte] No se pudo sembrar valorCampo.', error);
    }
  };

  seedValorCampo();

  const link = findLink();
  if (!(link instanceof HTMLAnchorElement)) return false;
  if (link.getClientRects().length === 0) return false;

  const handler = link.getAttribute('onclick') ?? '';
  console.log(`[Reporte] Enlace del instructor: ${JSON.stringify({
    id: link.id,
    onclick: handler,
    visible: true,
    frame: location.pathname,
  })}`);

  // El onclick del portal asume que enviarParametro funcione (sembrado con la línea de
  // arriba) y luego oamSubmitForm. Replicamos ese orden sin copiar código interno.
  const usarClickPortal = handler.includes('enviarParametro') || !handler.trim();
  try {
    link.focus();
    const options: MouseEventInit = { bubbles: true, cancelable: true, view: window, button: 0, detail: 1 };
    link.dispatchEvent(new MouseEvent('mousedown', options));
    link.dispatchEvent(new MouseEvent('mouseup', options));
    link.click();
    console.log(`[Reporte] Clic enviado al enlace medio portal (${usarClickPortal ? 'con' : 'sin'} manejador inline).`);
    return true;
  } catch (error) {
    console.error('[Reporte] No se pudo pulsar el enlace del instructor.', error);
    return false;
  }
}
