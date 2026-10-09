import type { AppElements, FileUploadState } from '../types.js';
import { writeHoursIntoExcel } from './excel-update/index.js';
import { highlightRow } from './excel-preview.js';
import { colorHoursCellInPreview } from './excel-update/preview-color.js';

function setSubmitState(button: HTMLButtonElement, state: 'idle' | 'loading' | 'success' | 'error'): void {
  const label = button.querySelector<HTMLSpanElement>('.btn-label');
  button.classList.remove('is-loading', 'is-success');
  if (state === 'loading') {
    button.classList.add('is-loading');
    if (label) label.textContent = 'Iniciando sesión...';
  } else if (state === 'success') {
    button.classList.add('is-success');
    if (label) label.textContent = 'Sesión abierta correctamente';
  } else if (label) {
    label.textContent = 'Iniciar sesión en SofiaPlus';
  }
}

export function initSubmit(elements: Pick<AppElements, 'uploadButton' | 'statusMessage' | 'dropzone' | 'dropzoneText' | 'fileInput' | 'excelPreview' | 'inputUser' | 'inputPass' | 'inputStartDate' | 'inputEndDate'>, state: FileUploadState): void {
  elements.uploadButton.addEventListener('click', async () => {
    if (!elements.inputUser.value || !elements.inputPass.value) { alert('Ingrese las credenciales de acceso.'); return; }
    if (!state.file) {
      elements.dropzone.classList.add('dropzone-error');
      elements.statusMessage.textContent = 'Debes subir un archivo Excel de nómina (.xls o .xlsx) para continuar.';
      alert('Sube el archivo Excel de nómina antes de iniciar sesión.');
      return;
    }
    if (state.identifications.length === 0) {
      elements.statusMessage.textContent = 'No se encontró una cédula válida en la columna requerida del Excel.';
      alert('No se encontraron cédulas válidas en el archivo Excel. Verifica la columna Columna 3 o "# DE DOCUMENTO" e intenta nuevamente.');
      return;
    }
    state.isUploading = true;
    elements.uploadButton.disabled = true;
    setSubmitState(elements.uploadButton, 'loading');
    elements.statusMessage.textContent = 'Abriendo SofiaPlus, llenando los campos e iniciando sesión...';
    try {
      const results = await window.electronAPI.openSofiaAndFill({
        username: elements.inputUser.value,
        password: elements.inputPass.value,
        startDate: elements.inputStartDate.value,
        endDate: elements.inputEndDate.value,
        identification: state.firstIdentification ?? '',
        identifications: state.identifications,
      }, (identification, hours) => {
        state.currentIdentification = identification;
        highlightRow(elements, identification);
        if (identification && hours) {
          colorHoursCellInPreview(elements, identification, hours);
        }
      });
      setSubmitState(elements.uploadButton, 'success');
      const found = results.filter((r) => r.totalHours);
      console.log('[AIA][Excel] Resultados SofiaPlus:', results);
      elements.statusMessage.textContent = found.length > 0
        ? `Horas leídas para ${found.length} de ${results.length} instructores. Actualizando el Excel...`
        : 'Sin horas del portal. No se modificó el Excel.';
      try {
        const updated = await writeHoursIntoExcel(results, elements, state);
        console.log('[AIA][Excel] writeHoursIntoExcel devolvió:', updated);
        if (!updated && found.length > 0) {
          elements.statusMessage.textContent = 'No se encontraron cédulas coincidentes en el Excel.';
        }
      } catch (updateError) {
        console.error('[AIA][Excel] No se pudo actualizar el Excel.', updateError);
        elements.statusMessage.textContent = `No se pudo actualizar el Excel: ${updateError instanceof Error ? updateError.message : String(updateError)}`;
      }
      window.setTimeout(() => setSubmitState(elements.uploadButton, 'idle'), 2500);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const userMessage = message.includes('rol necesario') ? message : 'No se pudo abrir SofiaPlus. Revisa tu conexión e inténtalo nuevamente.';
      elements.statusMessage.textContent = userMessage;
      setSubmitState(elements.uploadButton, 'error');
      alert(userMessage);
    } finally {
      state.isUploading = false;
      elements.uploadButton.disabled = false;
      window.setTimeout(() => setSubmitState(elements.uploadButton, 'idle'), 2800);
    }
  });
}
