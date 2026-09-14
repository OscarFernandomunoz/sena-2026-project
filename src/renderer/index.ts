import { initFileHandling } from '../components/renderer/excelPreview.js';
import { initLiveContext, initClock } from '../components/renderer/liveContext.js';
import { initSubmit } from '../components/renderer/submit.js';
import { initTheme } from '../components/renderer/theme.js';
import type { AppElements, FileUploadState } from '../components/renderer/types.js';

function getElements(): AppElements {
  return {
    clock: document.getElementById('clock') as HTMLElement,
    date: document.getElementById('currentDate') as HTMLElement,
    city: document.getElementById('currentCity') as HTMLElement,
    weather: document.getElementById('weather') as HTMLElement,
    weatherIcon: document.getElementById('weatherIcon') as HTMLElement,
    dropzone: document.getElementById('dropzone') as HTMLElement,
    fileInput: document.getElementById('fileInput') as HTMLInputElement,
    dropzoneText: document.getElementById('dropzoneText') as HTMLElement,
    excelPreview: document.getElementById('excelPreview') as HTMLElement,
    uploadButton: document.getElementById('btnUpload') as HTMLButtonElement,
    statusMessage: document.getElementById('statusMessage') as HTMLElement,
    inputUser: document.getElementById('usuario') as HTMLInputElement,
    inputPass: document.getElementById('password') as HTMLInputElement,
    inputStartDate: document.getElementById('fechaInicio') as HTMLInputElement,
    inputEndDate: document.getElementById('fechaFin') as HTMLInputElement,
    themeToggle: document.getElementById('themeToggle') as HTMLButtonElement,
  };
}

function initApp(): void {
  const elements = getElements();
  const state: FileUploadState = { file: null, firstIdentification: null, isUploading: false };

  initClock(elements);
  void initLiveContext(elements);
  initTheme(elements);
  initFileHandling(elements, state);
  initSubmit(elements, state);
}

document.addEventListener('DOMContentLoaded', initApp);
