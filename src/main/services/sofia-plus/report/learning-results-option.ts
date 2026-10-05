// Selección de la opción "RESULTADOS DE APRENDIZAJE" en el desplegable de Actividad
// de Formación, en el formulario principal del reporte.
//
// ⚠️ Las funciones de esta carpeta se serializan con `.toString()` y se ejecutan dentro
// de la página de SofiaPlus. NO pueden referenciar imports, constantes de módulo ni
// helpers externos: todo lo que usen debe existir dentro del propio cuerpo de cada
// función.

export async function selectLearningResultsOption(): Promise<boolean> {
  const normalize = (text: string): string => text.trim().toLocaleLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // El id contiene ':' (j_id JSF), así que en selector CSS va escapado; por eso
  // también se busca por name parcial como respaldo.
  const select = document.querySelector<HTMLSelectElement>('select#form1\\:actividadFormacionIT')
    ?? document.querySelector<HTMLSelectElement>('select[name="form1:actividadFormacionIT"]')
    ?? document.querySelector<HTMLSelectElement>('select[id*="actividadFormacionIT"]');
  if (!(select instanceof HTMLSelectElement)) {
    console.error('[Reporte] No se encontró el select de Actividad de Formación.');
    return false;
  }

  // Abrirlo como haría un usuario (sin cambio real no se ve la lista ni se registra).
  select.focus();
  const options = { bubbles: true, cancelable: true, view: window, button: 0, detail: 1 };
  select.dispatchEvent(new MouseEvent('mousedown', options));
  select.dispatchEvent(new MouseEvent('mouseup', options));
  select.click();

  // Elegir por texto normalizado primero; el value "1" es el respaldo.
  const targetText = 'resultados de aprendizaje';
  let optionIndex = -1;
  for (let i = 0; i < select.options.length; i += 1) {
    const option = select.options[i];
    if (!option) continue;
    if (normalize(option.textContent ?? '') === targetText) { optionIndex = i; break; }
  }
  if (optionIndex === -1) {
    for (let i = 0; i < select.options.length; i += 1) {
      const option = select.options[i];
      if (option && option.value === '1') { optionIndex = i; break; }
    }
  }
  if (optionIndex === -1) {
    console.error('[Reporte] No se encontró la opción RESULTADOS DE APRENDIZAJE.');
    return false;
  }

  const option = select.options[optionIndex];
  if (!option) return false;
  select.selectedIndex = optionIndex;
  select.value = option.value;
  select.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  select.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  console.log(`[Reporte] Opción de Actividad de Formación elegida: "${option.textContent?.trim() ?? ''}" (valor="${option.value}").`);
  return select.selectedIndex === optionIndex;
}
