import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import {
  GREEN_FILL,
  HOURS_COLUMN_NAME,
  HOURS_THRESHOLD,
  RED_FILL,
  hoursCellValue,
  isCedulaHeader,
  parseHoursValue,
  sameHeader,
} from './helpers.js';

// Fallback para archivos .xls (ExcelJS no los lee): reconstruye el libro desde las
// filas. Es la única ruta que puede perder el diseño original; solo se usa si ni
// Excel COM ni ExcelJS pudieron procesar el archivo.
export async function rebuildFromRows(data: ArrayBuffer, cedula: string, hours: string): Promise<ArrayBuffer | null> {
  const source = XLSX.read(data, { type: 'array' });
  const out = new ExcelJS.Workbook();
  let updated = false;
  for (const sheetName of source.SheetNames) {
    const sheet = source.Sheets[sheetName];
    const rows = sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) : [];
    const edited = applyHoursToRows(rows, cedula, hours);
    const ws = out.addWorksheet(sheetName);
    ws.addRows(edited ?? rows);
    if (edited) updated = true;
  }
  if (!updated) return null;
  colorHoursCell(out, cedula, hours);
  return (await out.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

// Versión que conserva SOLO las filas de las cédulas consultadas.
export async function rebuildFromRowsMultiple(
  data: ArrayBuffer,
  targets: Array<{ identification: string; totalHours: string }>,
): Promise<ArrayBuffer | null> {
  const source = XLSX.read(data, { type: 'array' });
  const out = new ExcelJS.Workbook();
  let updated = false;
  for (const sheetName of source.SheetNames) {
    const sheet = source.Sheets[sheetName];
    const rows = sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) : [];
    const keepRows = filterRowsByCedulas(rows, targets);
    const filtered = keepRows.length > 0 ? keepRows : rows;
    const ws = out.addWorksheet(sheetName);
    ws.addRows(filtered);
    for (const { identification, totalHours } of targets) {
      if (colorHoursCellInRows(ws, identification, totalHours)) updated = true;
    }
  }
  if (!updated) return null;
  return (await out.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

// Filtra las filas: conserva encabezados y solo las filas con las cédulas indicadas.
function filterRowsByCedulas(
  rows: unknown[][],
  targets: Array<{ identification: string; totalHours: string }>,
): unknown[][] {
  const cedulaHeader = findColumnAnywhere(rows, isCedulaHeader);
  if (!cedulaHeader) return [];
  const cedulaCol = cedulaHeader.col;
  const headerRowIndex = cedulaHeader.row;
  const cedulas = new Set(targets.map((t) => t.identification.trim()));
  const result: unknown[][] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (i <= headerRowIndex) {
      result.push(row);
      continue;
    }
    const cellValue = String(row[cedulaCol] ?? '').trim();
    if (cedulas.has(cellValue)) {
      result.push(row);
    }
  }
  return result;
}

// Colorea la celda de horas en una fila específica.
function colorHoursCellInRows(
  ws: ExcelJS.Worksheet,
  cedula: string,
  hours: string,
): boolean {
  const value = parseHoursValue(hours);
  const fillArgb = Number.isFinite(value) && value < HOURS_THRESHOLD ? RED_FILL : GREEN_FILL;
  let cedulaCol = -1;
  let hoursCol = -1;
  ws.eachRow((row) => {
    if (cedulaCol !== -1 && hoursCol !== -1) return;
    row.eachCell((cell, colNumber) => {
      if (cedulaCol === -1 && isCedulaHeader(cell.text ?? '')) cedulaCol = colNumber;
      if (hoursCol === -1 && sameHeader(cell.text ?? '', HOURS_COLUMN_NAME)) hoursCol = colNumber;
    });
  });
  if (cedulaCol === -1 || hoursCol === -1) return false;
  let found = false;
  ws.eachRow((row) => {
    if (found) return;
    if ((row.getCell(cedulaCol).text ?? '').trim() === cedula.trim()) {
      const cell = row.getCell(hoursCol);
      cell.value = hoursCellValue(hours);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
      found = true;
    }
  });
  return found;
}

// Busca la cédula/columna de horas RECORRIENDO TODA la hoja (cualquier fila o
// columna): el encabezado puede venir en dos filas y en la posición que sea.
function findColumnAnywhere(rows: unknown[][], matcher: (text: string) => boolean): { row: number; col: number } | null {
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r] ?? [];
    for (let c = 0; c < row.length; c += 1) {
      if (matcher(String(row[c] ?? ''))) return { row: r, col: c };
    }
  }
  return null;
}

// Edita las filas: pone las horas en la columna "Horas académicas" de la fila de la
// cédula y devuelve las filas modificadas, o null si no se encontró la cédula.
function applyHoursToRows(rows: unknown[][], cedula: string, hours: string): unknown[][] | null {
  const cedulaHeader = findColumnAnywhere(rows, isCedulaHeader);
  if (!cedulaHeader) return null;
  const cedulaCol = cedulaHeader.col;
  const hoursHeader = findColumnAnywhere(rows, (text) => sameHeader(text, HOURS_COLUMN_NAME));
  let hoursCol: number;
  if (hoursHeader) {
    hoursCol = hoursHeader.col;
  } else {
    hoursCol = (rows[cedulaHeader.row] ?? []).length;
    const headerRow = rows[cedulaHeader.row] ?? [];
    headerRow.push(HOURS_COLUMN_NAME);
    rows[cedulaHeader.row] = headerRow;
  }
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (String(row[cedulaCol] ?? '').trim() === cedula.trim()) {
      row[hoursCol] = hours;
      rows[i] = row;
      return rows;
    }
  }
  return null;
}

// Colorea la celda de la cédula indicada en un libro ExcelJS según el umbral de horas.
function colorHoursCell(workbook: ExcelJS.Workbook, cedula: string, hours: string): boolean {
  const value = parseHoursValue(hours);
  const fillArgb = Number.isFinite(value) && value < HOURS_THRESHOLD ? RED_FILL : GREEN_FILL;
  let found = false;
  workbook.eachSheet((worksheet) => {
    if (found) return;
    let cedulaCol = -1;
    let hoursCol = -1;
    // Recorre toda la hoja buscando las etiquetas, sin importar en qué fila/columna estén.
    worksheet.eachRow((row) => {
      if (cedulaCol !== -1 && hoursCol !== -1) return;
      row.eachCell((cell, colNumber) => {
        if (cedulaCol === -1 && isCedulaHeader(cell.text ?? '')) cedulaCol = colNumber;
        if (hoursCol === -1 && sameHeader(cell.text ?? '', HOURS_COLUMN_NAME)) hoursCol = colNumber;
      });
    });
    if (cedulaCol === -1 || hoursCol === -1) return;
    worksheet.eachRow((row) => {
      if (found) return;
      if ((row.getCell(cedulaCol).text ?? '').trim() === cedula.trim()) {
        const cell = row.getCell(hoursCol);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
        found = true;
      }
    });
  });
  return found;
}
