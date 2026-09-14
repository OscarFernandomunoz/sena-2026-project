import * as XLSX from 'xlsx';
import type { AppElements, FileUploadState } from './types.js';

const REQUIRED_COLUMN_NUMBER = 3;
const REQUIRED_COLUMN_NAME = `Columna ${REQUIRED_COLUMN_NUMBER}`;
const ALTERNATIVE_COLUMN_NAME = '# DE DOCUMENTO';
const REQUIRED_COLUMN_NAMES = [REQUIRED_COLUMN_NAME, ALTERNATIVE_COLUMN_NAME];
const REQUIRED_COLUMN_LABEL = `${REQUIRED_COLUMN_NAME} o ${ALTERNATIVE_COLUMN_NAME}`;
const DROPZONE_HINT = `Arrastra y suelta tu archivo de nómina aquí (.xls, .xlsx). Obligatorio. Debe incluir ${REQUIRED_COLUMN_LABEL}.`;

type FileElements = Pick<AppElements, 'dropzone' | 'fileInput' | 'dropzoneText' | 'excelPreview' | 'statusMessage'>;

export function initFileHandling(elements: FileElements, state: FileUploadState): void {
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

function validateAndSetFile(file: File, elements: FileElements, state: FileUploadState): void {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'xls' && extension !== 'xlsx') { alert('Solo se permiten archivos Excel en formato .xls o .xlsx'); return; }
  elements.dropzoneText.innerHTML = `Archivo seleccionado: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
  elements.statusMessage.textContent = `Archivo "${file.name}" cargado. Validando ${REQUIRED_COLUMN_NAME}...`;
  void previewExcel(file, elements, state);
}

async function previewExcel(file: File, elements: FileElements, state: FileUploadState): Promise<void> {
  elements.excelPreview.replaceChildren();
  elements.excelPreview.textContent = 'Leyendo información del Excel...';
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheets = workbook.SheetNames.map((sheetName) => ({
      sheetName,
      rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '' }),
    }));
    const validationResults = sheets.map(({ sheetName, rows }) => validateRequiredColumn(rows, sheetName));
    const validSheetCount = validationResults.filter((result) => result === null).length;
    if (validSheetCount === 0) {
      rejectFile(elements, state, validationResults.find(Boolean) ?? `Ninguna hoja contiene ${REQUIRED_COLUMN_LABEL} con datos válidos.`);
      return;
    }
    const firstIdentification = sheets
      .map(({ rows }) => getFirstIdentification(rows))
      .find((identification): identification is string => Boolean(identification)) ?? null;
    const fragment = document.createDocumentFragment();
    sheets.forEach(({ sheetName, rows }) => {
      const section = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = sheetName;
      section.appendChild(title);
      if (!rows.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Esta hoja está vacía.';
        section.appendChild(empty);
      } else {
        const table = createTable(rows, findRequiredColumnIndex(rows)?.columnIndex ?? -1);
        section.appendChild(createFilterBar(table));
        const wrapper = document.createElement('div');
        wrapper.className = 'excel-table-wrapper';
        wrapper.appendChild(table);
        section.appendChild(wrapper);
      }
      fragment.appendChild(section);
    });
    state.file = file;
    state.firstIdentification = firstIdentification;
    elements.dropzone.classList.remove('dropzone-error');
    elements.excelPreview.replaceChildren(fragment);
    elements.statusMessage.textContent = `Información de ${file.name} lista para revisar. ${REQUIRED_COLUMN_LABEL} presente.`;
  } catch {
    rejectFile(elements, state, 'No se pudo leer este archivo Excel.');
  }
}

function validateRequiredColumn(rows: unknown[][], sheetName: string): string | null {
  const requiredColumn = findRequiredColumnIndex(rows);
  if (!requiredColumn) {
    return `La hoja "${sheetName}" no tiene ${REQUIRED_COLUMN_LABEL}. Ese campo es obligatorio.`;
  }
  return null;
}

function findRequiredColumnIndex(rows: unknown[][]): { headerRowIndex: number; columnIndex: number } | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const columnIndex = (rows[rowIndex] ?? []).findIndex((cell) => REQUIRED_COLUMN_NAMES.some((name) => (
      name.toLocaleUpperCase() === String(cell ?? '').trim().toLocaleUpperCase()
    )));
    if (columnIndex !== -1) return { headerRowIndex: rowIndex, columnIndex };
  }
  return null;
}

function getFirstIdentification(rows: unknown[][]): string | null {
  const requiredColumn = findRequiredColumnIndex(rows);
  if (!requiredColumn) return null;
  const firstValue = rows.slice(requiredColumn.headerRowIndex + 1)
    .map((row) => String(row[requiredColumn.columnIndex] ?? '').trim())
    .find(Boolean);
  return firstValue ?? null;
}

function rejectFile(elements: FileElements, state: FileUploadState, message: string): void {
  state.file = null;
  state.firstIdentification = null;
  elements.fileInput.value = '';
  elements.dropzone.classList.add('dropzone-error');
  elements.dropzoneText.textContent = DROPZONE_HINT;
  elements.excelPreview.textContent = message;
  elements.statusMessage.textContent = message;
  alert(message);
}

function createTable(rows: unknown[][], requiredColumnIndex: number): HTMLTableElement {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const body = document.createElement('tbody');
  rows.forEach((row, rowIndex) => {
    const tableRow = document.createElement('tr');
    row.forEach((cell, cellIndex) => {
      const tableCell = document.createElement(rowIndex === 0 ? 'th' : 'td');
      tableCell.textContent = rowIndex === 0 ? String(cell ?? '') || `Columna ${cellIndex + 1}` : String(cell ?? '');
      if (cellIndex === requiredColumnIndex) tableCell.classList.add('excel-required-column');
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
