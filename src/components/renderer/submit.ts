import type { AppElements, FileUploadState } from './types.js';

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

export function initSubmit(elements: Pick<AppElements, 'uploadButton' | 'statusMessage' | 'dropzone' | 'inputUser' | 'inputPass' | 'inputStartDate' | 'inputEndDate'>, state: FileUploadState): void {
  elements.uploadButton.addEventListener('click', async () => {
    if (!elements.inputUser.value || !elements.inputPass.value) { alert('Ingrese las credenciales de acceso.'); return; }
    if (!state.file) {
      elements.dropzone.classList.add('dropzone-error');
      elements.statusMessage.textContent = 'Debes subir un archivo Excel de nómina (.xls o .xlsx) para continuar.';
      alert('Sube el archivo Excel de nómina antes de iniciar sesión.');
      return;
    }
    if (!state.firstIdentification) {
      elements.statusMessage.textContent = 'No se encontró una cédula válida en la columna requerida del Excel.';
      alert('No se encontró una cédula válida en el archivo Excel. Verifica la columna 3 o "# DE DOCUMENTO" e intenta nuevamente.');
      return;
    }
    state.isUploading = true;
    elements.uploadButton.disabled = true;
    setSubmitState(elements.uploadButton, 'loading');
    elements.statusMessage.textContent = 'Abriendo SofiaPlus, llenando los campos e iniciando sesión...';
    try {
      await window.electronAPI.openSofiaAndFill({
        username: elements.inputUser.value,
        password: elements.inputPass.value,
        startDate: elements.inputStartDate.value,
        endDate: elements.inputEndDate.value,
        identification: state.firstIdentification,
      });
      setSubmitState(elements.uploadButton, 'success');
      elements.statusMessage.textContent = 'Sesión iniciada en SofiaPlus.';
      window.setTimeout(() => {
        if (!state.isUploading) setSubmitState(elements.uploadButton, 'idle');
      }, 2500);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const userMessage = message.includes('rol necesario') ? message : 'No se pudo abrir SofiaPlus. Revisa tu conexión e inténtalo nuevamente.';
      elements.statusMessage.textContent = userMessage;
      setSubmitState(elements.uploadButton, 'error');
      alert(userMessage);
    } finally {
      state.isUploading = false;
      elements.uploadButton.disabled = false;
      window.setTimeout(() => {
        if (!state.isUploading) setSubmitState(elements.uploadButton, 'idle');
      }, 2800);
    }
  });
}
