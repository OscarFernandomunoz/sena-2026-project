// Lee el total de horas del reporte de tiempos (<span id="form1:txtTotalHoras">160</span>).
//
// ⚠️ Función autocontenida: se serializa con `.toString()` y se ejecuta dentro de la
// página de SofiaPlus; todo auxiliar va en el cuerpo de la función.

export function readTotalHours(): string | null {
  // El id JSF lleva ':'; getElementById lo acepta tal cual. Fallbacks por si el
  // formulario cambia de prefijo (form1, form2...) o el id se recorta.
  const candidates: Array<HTMLElement | null> = [
    document.getElementById('form1:txtTotalHoras'),
    document.querySelector<HTMLElement>('span[id$=":txtTotalHoras"], span[id*="txtTotalHoras"], span[id*="TotalHoras"], span[id*="totalHoras"]'),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    // El portal muestra "24.48 × 12" pero el total real viene en el atributo title
    // (ej. "1248"): se prefiere ese valor numérico.
    const title = (candidate.getAttribute('title') ?? '').trim();
    if (title && /^[\d.,\s]+$/.test(title) && /\d/.test(title)) return title;
    const text = (candidate.textContent ?? '').trim();
    if (text.length > 0) return text;
  }
  // Diagnóstico: lista los spans con algún id parecido al buscado.
  const hints = Array.from(document.querySelectorAll<HTMLElement>('span[id]'))
    .map((el) => el.id)
    .filter((id) => /horas|total/i.test(id))
    .slice(0, 10);
  console.log('[Reporte] readTotalHours: no halló txtTotalHoras. Ids parecidos:', JSON.stringify(hints));
  return null;
}
