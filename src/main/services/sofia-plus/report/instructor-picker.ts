// Abre el diálogo de selección de instructor del reporte.
//
// ⚠️ Las funciones de esta carpeta se serializan con `.toString()` y se ejecutan dentro de
// la página de SofiaPlus. NO pueden referenciar imports, constantes de módulo ni helpers
// externos: todo lo que usen debe existir dentro del propio cuerpo de cada función.
import type { ClickPoint } from '../types.js';

// Hace clic en el enlace de lookup del instructor para abrir el diálogo de selección.
export async function findInstructorPicker(): Promise<boolean> {
  // El prefijo JSF del formulario (formConsultarRegistroTiempo) cambia en cada ejecución, así
  // que un id completo no es fiable: se busca por el sufijo estable, igual que hacen el resto
  // de pasos del flujo. El id exacto se conserva solo como último recurso.
  //
  // No se exige visibilidad (`getClientRects`): cuando el diálogo queda tapado por el overlay
  // de blockUI el enlace sí existe, y exigirlo hacía que este paso devolviera false sin clic.
  // El id JSF cambia en cada página, por eso se busca también por coincidencia parcial
  // normalizada sobre el sufijo estable "instructorOLK".
  const normalize = (value: string): string => value.trim().toLocaleLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const byNormalizedId = Array.from(document.querySelectorAll<HTMLElement>('[id], [name]'))
    .find((element) => normalize(element.id).includes('instructorolk')
      || normalize(element.getAttribute('name') ?? '').includes('instructorolk')) ?? null;
  const picker = document.querySelector<HTMLElement>('[id$=":instructorOLK"], [id$="instructorOLK"]')
    ?? byNormalizedId
    ?? document.getElementById('formConsultarRegistroTiempo:instructorOLK');
  if (!(picker instanceof HTMLElement)) {
    console.error('[Reporte] No se encontró el enlace del selector de instructor.');
    document.querySelectorAll<HTMLElement>('a[id], a[name], input[id], input[name]').forEach((candidate) => {
      console.log(`[Reporte] Enlace/input presente: tag=${candidate.tagName.toLowerCase()}, id="${candidate.id}", name="${candidate.getAttribute('name') ?? ''}"`);
    });
    return false;
  }

  console.log(`[Reporte] Selector de instructor encontrado: ${JSON.stringify({
    id: picker.id || '(sin id)',
    etiqueta: picker.getAttribute('name') || picker.getAttribute('onclick')?.slice(0, 120) || '(sin onclick)',
    visible: picker.getClientRects().length > 0,
    frame: location.pathname,
  })}`);

  const clickable = picker.closest('a') ?? picker;
  clickable.click();
  return true;
}

// Solo UBICA el enlace del selector de instructor y devuelve sus coordenadas: no hace clic.
// Así se puede resaltar con la esfera sin ejecutar la acción real (modo marcado).
export async function findInstructorPickerPoint(): Promise<ClickPoint | null> {
  const normalize = (value: string): string => value.trim().toLocaleLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const byNormalizedId = Array.from(document.querySelectorAll<HTMLElement>('[id], [name]'))
    .find((element) => normalize(element.id).includes('instructorolk')
      || normalize(element.getAttribute('name') ?? '').includes('instructorolk')) ?? null;
  const picker = document.querySelector<HTMLElement>('[id$=":instructorOLK"], [id$="instructorOLK"]')
    ?? byNormalizedId
    ?? document.getElementById('formConsultarRegistroTiempo:instructorOLK');
  if (!(picker instanceof HTMLElement)) {
    console.error('[Reporte] No se encontró el enlace del selector de instructor.');
    return null;
  }
  const clickable = picker.closest('a') ?? picker;
  const rect = clickable.getBoundingClientRect();
  let x = rect.left + rect.width / 2;
  let y = rect.top + rect.height / 2;
  let currentWindow: Window = window;
  while (currentWindow.frameElement) {
    const frameRect = currentWindow.frameElement.getBoundingClientRect();
    x += frameRect.left;
    y += frameRect.top;
    currentWindow = currentWindow.parent;
  }
  console.log(`[Reporte] Botón selector ubicado en (${Math.round(x)}, ${Math.round(y)}).`);
  return { x, y };
}
