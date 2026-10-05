// Pulsa el botón Consultar del formulario principal del reporte de tiempos
// (<input id="form1:consultarFichaCBT" type="submit" class="boton_app" value="Consultar">).
//
// ⚠️ Función autocontenida: se serializa con `.toString()` y se ejecuta dentro de la
// página de SofiaPlus; todo auxiliar va en el cuerpo de la función.

export async function submitInstructorTimesReport(): Promise<boolean> {
  // El id JSF lleva ':'; por eso id*="consultarFichaCBT" y el sufijo estable
  // ":consultarFichaCBT". Value "Consultar" queda como chequeo de etiqueta.
  const candidates = Array.from(document.querySelectorAll<HTMLInputElement>(
    'input[id*="consultarFichaCBT"], input[id$=":consultarFichaCBT"]',
  ));
  const usable = candidates.filter((candidate) =>
    candidate.getClientRects().length > 0 && !candidate.hasAttribute('disabled'));
  const best = usable[0] ?? null;
  if (!best) {
    console.error('[Reporte] No se encontró el botón Consultar del formulario de tiempos.');
    return false;
  }
  console.log(`[Reporte] Botón Consultar encontrado: id="${best.id}", value="${best.value}".`);
  try {
    best.focus();
    const options: MouseEventInit = { bubbles: true, cancelable: true, view: window, button: 0, detail: 1 };
    best.dispatchEvent(new MouseEvent('mousedown', options));
    best.dispatchEvent(new MouseEvent('mouseup', options));
    best.click();
    return true;
  } catch (error) {
    console.error('[Reporte] No se pudo pulsar el botón Consultar del reporte.', error);
    return false;
  }
}
