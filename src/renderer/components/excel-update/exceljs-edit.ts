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
    if (paintHoursCell(workbook, identification, totalHours)) {
      anyPainted = true;
    }
  }
  // Ya no eliminamos filas aquí; ExcelJS conservará todas las filas
  // y solo pintará las celdas de horas. El diseño se conservará
  // tanto como sea posible con ExcelJS.
  if (!anyPainted) return null;
  return (await workbook.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

// Pinta la celda de horas de la cédula indicada en todas las hojas.
// Busca la columna "Horas académicas" en TODO el worksheet (no solo en el encabezado)
// y luego localiza la fila con la cédula matching.
function paintHoursCell(workbook: ExcelJS.Workbook, cedula: string, hours: string): boolean {
  const value = parseHoursValue(hours);
  const fillArgb = Number.isFinite(value) && value < HOURS_THRESHOLD ? RED_FILL : GREEN_FILL;
  let found = false;

  workbook.eachSheet((worksheet) => {
    if (found) return;

    // PASO 1: Buscar las columnas de cédula y "Horas académicas" en TODO el worksheet
    // Recorremos todas las filas y todas las celdas para encontrar los encabezados
    let cedulaCol = -1;
    let hoursCol = -1;
    let cedulaHeaderRow = -1;
    let hoursHeaderRow = -1;

    worksheet.eachRow((row, rowNumber) => {
      if (cedulaCol !== -1 && hoursCol !== -1 && cedulaHeaderRow !== -1 && hoursHeaderRow !== -1) return;
      row.eachCell((cell, colNumber) => {
        // Buscar columna de cédula (puede estar en cualquier fila)
        if (cedulaCol === -1 && isCedulaHeader(cell.text ?? '')) {
          cedulaCol = colNumber;
          cedulaHeaderRow = rowNumber;
        }
        // Buscar columna "Horas académicas" (puede estar en cualquier fila)
        if (hoursCol === -1 && sameHeader(cell.text ?? '', HOURS_COLUMN_NAME)) {
          hoursCol = colNumber;
          hoursHeaderRow = rowNumber;
        }
      });
    });

    // Si no encontramos ambas columnas, seguimos a la siguiente hoja
    if (cedulaCol === -1 || hoursCol === -1) return;

    // PASO 2: Buscar la fila con la cédula matching y pintar la celda de horas
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