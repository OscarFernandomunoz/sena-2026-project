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

// Edita el libro ORIGINAL con ExcelJS (sin reconstruirlo): solo se modifica la celda
// de horas de la cédula y su color. El resto de estilos, fuentes, anchos y filtros
// del archivo subido se conservan.
export async function editOriginalWorkbook(data: ArrayBuffer, cedula: string, hours: string): Promise<ArrayBuffer | null> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(data);
  } catch {
    // El archivo no es .xlsx (por ejemplo .xls): el llamador usa el fallback.
    return null;
  }
  const painted = paintHoursCell(workbook, cedula, hours);
  if (!painted) return null;
  return (await workbook.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

function paintHoursCell(workbook: ExcelJS.Workbook, cedula: string, hours: string): boolean {
  const value = parseHoursValue(hours);
  const fillArgb = Number.isFinite(value) && value < HOURS_THRESHOLD ? RED_FILL : GREEN_FILL;
  let found = false;
  workbook.eachSheet((worksheet) => {
    if (found) return;
    let cedulaCol = -1;
    let cedulaHeaderRow = 0;
    let hoursCol = -1;
    // Recorre toda la hoja buscando las etiquetas, sin importar en qué fila/columna estén.
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
    if (cedulaCol === -1) return;
    if (hoursCol === -1) {
      // No existe la columna: se crea en la misma fila del encabezado de cédula.
      hoursCol = worksheet.getRow(cedulaHeaderRow).cellCount + 1;
      const headerCell = worksheet.getRow(cedulaHeaderRow).getCell(hoursCol);
      headerCell.value = HOURS_COLUMN_NAME;
    }
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
