import type { AppElements, FileUploadState } from './types.js';

export function initSubmit(elements: Pick<AppElements, 'uploadButton' | 'statusMessage' | 'inputUser' | 'inputPass' | 'inputStartDate' | 'inputEndDate'>, state: FileUploadState): void {
  elements.uploadButton.addEventListener('click', async () => {
    if (!elements.inputUser.value || !elements.inputPass.value) { alert('Ingrese las credenciales de acceso.'); return; }
    state.isUploading = true;
    elements.uploadButton.disabled = true;
    elements.uploadButton.textContent = 'Iniciando sesión...';
    elements.statusMessage.textContent = 'Abriendo SofiaPlus, llenando los campos e iniciando sesión...';
    try {
      await window.electronAPI.openSofiaAndFill({ username: elements.inputUser.value, password: elements.inputPass.value, startDate: elements.inputStartDate.value, endDate: elements.inputEndDate.value });
      elements.statusMessage.textContent = 'Sesión iniciada en SofiaPlus.';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const userMessage = message.includes('rol necesario') ? message : 'No se pudo abrir SofiaPlus. Revisa tu conexión e inténtalo nuevamente.';
      elements.statusMessage.textContent = userMessage;
      alert(userMessage);
    } finally {
      state.isUploading = false;
      elements.uploadButton.disabled = false;
      elements.uploadButton.textContent = 'Iniciar sesión en SofiaPlus';
    }
  });
}
