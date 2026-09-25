// Pulsa el enlace del instructor devuelto por la consulta y propaga sus parámetros
// al formulario destino cuando el portal lo abre en una ventana emergente.
//
// ⚠️ Las funciones de esta carpeta se serializan con `.toString()` y se ejecutan dentro de
// la página de SofiaPlus. NO pueden referenciar imports, constantes de módulo ni helpers
// externos: todo lo que usen debe existir dentro del propio cuerpo de cada función.

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
