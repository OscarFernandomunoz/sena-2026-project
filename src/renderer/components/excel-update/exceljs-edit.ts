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

// Versión que conserva SOLO las filas de las cédulas consultadas.
// Devuelve el libro con los encabezados originales y solo las filas que coinciden.
export async function editOriginalWorkbookMultiple(
  data: ArrayBuffer,
  targets: Array<{ identification: string; totalHours: string }>,
): Promise<ArrayBuffer | null> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(data);
  } catch {
    return null;
  }
  let anyPainted = false;
  for (const { identification, totalHours } of targets) {
    if (paintHoursCellAndFilterRows(workbook, identification, totalHours)) {
      anyPainted = true;
    }
  }
  if (!anyPainted) return null;
  return (await workbook.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

// Pinta la celda de horas y elimina todas las filas excepto la de la cédula.
function paintHoursCellAndFilterRows(workbook: ExcelJS.Workbook, cedula: string, hours: string): boolean {
  const value = parseHoursValue(hours);
  const fillArgb = Number.isFinite(value) && value < HOURS_THRESHOLD ? RED_FILL : GREEN_FILL;
  let found = false;
  workbook.eachSheet((worksheet) => {
    if (found) return;
    let cedulaCol = -1;
    let cedulaHeaderRow = 0;
    let hoursCol = -1;
    // Buscar columnas de cédula y horas
    worksheet.eachRow((row) => {
      if (cedulaCol !== -1 && hoursCol !== -1) return;
      row.eachCell((cell, colNumber) => {
        if (cedulaCol === -1 && isCedulaHeader(cell.text ?? '')) {
          cedulaCol = colNumber;
          cedulaHeaderRow = row.number;
        }
        if (hoursCol === -1 && sameHeader(cell.text ?? '', HOURS_COLUMN_NAME)) hoursCol = colNumber;
      });
    });
    if (cedulaCol === -1) {
      console.warn(`[AIA][Excel] No se encontró la columna de cédula en la hoja.`);
      return;
    }
    if (hoursCol === -1) {
      hoursCol = worksheet.getRow(cedulaHeaderRow).cellCount + 1;
      const headerCell = worksheet.getRow(cedulaHeaderRow).getCell(hoursCol);
      headerCell.value = HOURS_COLUMN_NAME;
    }
    // Buscar la fila con la cédula
    let targetRowNum = -1;
    let totalRows = 0;
    const availableCedulas: string[] = [];
    worksheet.eachRow((row) => {
      totalRows += 1;
      const cellText = (row.getCell(cedulaCol).text ?? '').trim();
      if (cellText && row.number > cedulaHeaderRow) {
        availableCedulas.push(cellText);
      }
      if (targetRowNum !== -1) return;
      if (cellText === cedula.trim()) {
        targetRowNum = row.number;
      }
    });
    if (targetRowNum === -1) {
      console.warn(`[AIA][Excel] No se encontró la cédula "${cedula}" en la hoja. Total filas: ${totalRows}`);
      console.warn(`[AIA][Excel] Cédulas disponibles: ${availableCedulas.slice(0, 10).join(', ')}`);
      return;
    }
    const cell = worksheet.getRow(targetRowNum).getCell(hoursCol);
    cell.value = hoursCellValue(hours);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
    // Eliminar todas las filas excepto encabezados y la fila de la cédula
    const rowsToDelete: number[] = [];
    worksheet.eachRow((row) => {
      if (row.number <= cedulaHeaderRow || row.number === targetRowNum) return;
      rowsToDelete.push(row.number);
    });
    // Eliminar de atrás hacia adelante para no desplazar índices
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      const rowNum = rowsToDelete[i];
      if (rowNum !== undefined) worksheet.spliceRows(rowNum, 1);
    }
    console.log(`[AIA][Excel] Cédula ${cedula}: fila ${targetRowNum} conservada, ${rowsToDelete.length} filas eliminadas.`);
    found = true;
  });
  return found;
}
