// Localiza y pulsa el input "Consultar" del diálogo de instructor.
//
// ⚠️ Las funciones de esta carpeta se serializan con `.toString()` y se ejecutan dentro de
// la página de SofiaPlus. NO pueden referenciar imports, constantes de módulo ni helpers
// externos: todo lo que usen debe existir dentro del propio cuerpo de cada función.

// Espera dentro del flujo y pulsa el enlace exacto generado por la consulta.
// Usa getElementById porque el ID contiene varios dos puntos y necesitaría
// escaping especial si se usara como selector CSS.
//
// El selector real cambia de prefijo JSF en cada ejecución, pero conserva un ID que
// termina en ":btnSearch" y las clases btn btn-info btn-block.
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
      // para saber qué hay en pantalla y por qué no coincidí ninguno.
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
