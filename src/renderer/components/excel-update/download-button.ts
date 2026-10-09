import type { FileElements } from '../excel-preview.js';

// Crea el botón de descarga y lo inserta después de la tabla de vista previa.
export function showDownloadButton(elements: FileElements, onDownload: () => void): void {
  removeDownloadButton(elements);
  const button = document.createElement('button');
  button.className = 'excel-download-btn';
  button.textContent = 'Descargar archivo actualizado';
  button.addEventListener('click', onDownload);
  elements.excelPreview.appendChild(button);
}

// Remueve el botón de descarga si existe.
export function removeDownloadButton(elements: FileElements): void {
  const existing = elements.excelPreview.querySelector('.excel-download-btn');
  if (existing) existing.remove();
}
