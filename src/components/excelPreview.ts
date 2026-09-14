import * as XLSX from 'xlsx';
import type { AppElements, FileUploadState } from './types.js';

export function initFileHandling(elements: Pick<AppElements, 'dropzone' | 'fileInput' | 'dropzoneText' | 'excelPreview' | 'statusMessage'>, state: FileUploadState): void {
  elements.dropzone.addEventListener('click', () => elements.fileInput.click());
  elements.dropzone.addEventListener('dragover', (event: DragEvent) => { event.preventDefault(); elements.dropzone.classList.add('dragover'); });
  elements.dropzone.addEventListener('dragleave', () => elements.dropzone.classList.remove('dragover'));
  elements.dropzone.addEventListener('drop', (event: DragEvent) => {
    event.preventDefault();
    elements.dropzone.classList.remove('dragover');
    if (event.dataTransfer?.files.length) validateAndSetFile(event.dataTransfer.files[0], elements, state);
  });
  elements.fileInput.addEventListener('change', (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) validateAndSetFile(input.files[0], elements, state);
  });
}

function validateAndSetFile(file: File, elements: Pick<AppElements, 'dropzoneText' | 'excelPreview' | 'statusMessage'>, state: FileUploadState): void {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'xls' && extension !== 'xlsx') { alert('Solo se permiten archivos Excel en formato .xls o .xlsx'); return; }
  state.file = file;
  elements.dropzoneText.innerHTML = `Archivo seleccionado: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
  elements.statusMessage.textContent = `Archivo "${file.name}" cargado. Listo para procesar.`;
  void previewExcel(file, elements);
}

async function previewExcel(file: File, elements: Pick<AppElements, 'excelPreview' | 'statusMessage'>): Promise<void> {
  elements.excelPreview.replaceChildren();
  elements.excelPreview.textContent = 'Leyendo información del Excel...';
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const fragment = document.createDocumentFragment();
    workbook.SheetNames.forEach((sheetName) => {
      const section = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = sheetName;
      section.appendChild(title);
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '' });
      if (!rows.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Esta hoja está vacía.';
        section.appendChild(empty);
      } else {
        const table = createTable(rows);
        section.appendChild(createFilterBar(table));
        const wrapper = document.createElement('div');
        wrapper.className = 'excel-table-wrapper';
        wrapper.appendChild(table);
        section.appendChild(wrapper);
      }
      fragment.appendChild(section);
    });
    elements.excelPreview.replaceChildren(fragment);
    elements.statusMessage.textContent = `Información de ${file.name} lista para revisar.`;
  } catch {
    elements.excelPreview.textContent = 'No se pudo leer este archivo Excel.';
    elements.statusMessage.textContent = 'Error al leer el archivo Excel.';
  }
}

function createTable(rows: unknown[][]): HTMLTableElement {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const body = document.createElement('tbody');
  rows.forEach((row, rowIndex) => {
    const tableRow = document.createElement('tr');
    row.forEach((cell, cellIndex) => {
      const tableCell = document.createElement(rowIndex === 0 ? 'th' : 'td');
      tableCell.textContent = rowIndex === 0 ? String(cell ?? '') || `Columna ${cellIndex + 1}` : String(cell ?? '');
      tableRow.appendChild(tableCell);
    });
    (rowIndex === 0 ? head : body).appendChild(tableRow);
  });
  table.append(head, body);
  return table;
}

function createFilterBar(table: HTMLTableElement): HTMLDivElement {
  const bar = document.createElement('div');
  bar.className = 'excel-filter-bar';
  const label = document.createElement('label');
  label.className = 'excel-filter-label';
  label.textContent = 'Buscar en';
  const select = document.createElement('select');
  select.className = 'excel-column-select';
  select.setAttribute('aria-label', 'Seleccionar columna para buscar');
  select.innerHTML = '<option value="all">Todas las columnas</option>';
  Array.from(table.tHead?.rows[0]?.cells ?? []).forEach((cell, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = cell.textContent || `Columna ${index + 1}`;
    select.appendChild(option);
  });
  const input = document.createElement('input');
  input.className = 'excel-filter-input';
  input.type = 'search';
  input.placeholder = 'Escribe para buscar...';
  input.setAttribute('aria-label', 'Texto de búsqueda');
  const apply = (): void => {
    const value = input.value.trim().toLocaleLowerCase();
    Array.from(table.tBodies[0].rows).forEach((row) => {
      const cells = Array.from(row.cells);
      const values = select.value === 'all' ? cells : [cells[Number(select.value)]];
      row.hidden = Boolean(value) && !values.some((cell) => cell?.textContent?.toLocaleLowerCase().includes(value));
    });
  };
  select.addEventListener('change', apply);
  input.addEventListener('input', apply);
  bar.append(label, select, input);
  return bar;
}
