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

// Versión que conserva solo las filas de las cédulas consultadas.
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
    if (paintHoursCell(workbook, identification, totalHours)) {
      anyPainted = true;
    }
  }
  if (!anyPainted) return null;
  filterRowsByTargets(workbook, targets);
  return (await workbook.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

// Pinta la celda de horas de la cédula indicada en todas las hojas.
function paintHoursCell(workbook: ExcelJS.Workbook, cedula: string, hours: string): boolean {
  const value = parseHoursValue(hours);
  const fillArgb = Number.isFinite(value) && value < HOURS_THRESHOLD ? RED_FILL : GREEN_FILL;
  let found = false;
  workbook.eachSheet((worksheet) => {
    if (found) return;
    let cedulaCol = -1;
    let hoursCol = -1;
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
        cell.value = hoursCellValue(hours);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
        found = true;
      }
    });
  });
  return found;
}

// Elimina todas las filas excepto encabezados y las filas de las cédulas indicadas.
function filterRowsByTargets(workbook: ExcelJS.Workbook, targets: Array<{ identification: string; totalHours: string }>): void {
  const targetCedulas = new Set(targets.map((t) => t.identification.trim()));
  workbook.eachSheet((worksheet) => {
    let cedulaCol = -1;
    let cedulaHeaderRow = 0;
    worksheet.eachRow((row) => {
      if (cedulaCol !== -1) return;
      row.eachCell((cell, colNumber) => {
        if (cedulaCol === -1 && isCedulaHeader(cell.text ?? '')) {
          cedulaCol = colNumber;
          cedulaHeaderRow = row.number;
        }
      });
    });
    if (cedulaCol === -1) return;
    const rowsToDelete: number[] = [];
    worksheet.eachRow((row) => {
      if (row.number <= cedulaHeaderRow) return;
      const cellText = (row.getCell(cedulaCol).text ?? '').trim();
      if (!targetCedulas.has(cellText)) {
        rowsToDelete.push(row.number);
      }
    });
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      const rowNum = rowsToDelete[i];
      if (rowNum !== undefined) worksheet.spliceRows(rowNum, 1);
    }
  });
}
