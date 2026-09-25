// Localiza y rellena el campo de número de identificación del instructor.
//
// ⚠️ Las funciones de esta carpeta se serializan con `.toString()` y se ejecutan dentro de
// la página de SofiaPlus. NO pueden referenciar imports, constantes de módulo ni helpers
// externos: todo lo que usen debe existir dentro del propio cuerpo de cada función.

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
