import type { FileElements } from '../excel-preview.js';
import { HOURS_COLUMN_NAME, HOURS_THRESHOLD, hoursCellValue, isCedulaHeader, parseHoursValue, sameHeader } from './helpers.js';

// Actualiza la celda de horas en la vista previa HTML con el valor leído del portal,
// aplicando color rojo (umbral no cumplido) o verde (umbral cumplido).
export function colorHoursCellInPreview(elements: FileElements, cedula: string, hours: string): void {
  const value = parseHoursValue(hours);
  const background = Number.isFinite(value) && value < HOURS_THRESHOLD ? '#ff0000' : '#00b050';
  for (const table of elements.excelPreview.querySelectorAll('table')) {
    const allRows = [...(table.tHead ? Array.from(table.tHead.rows) : []), ...Array.from(table.tBodies[0]?.rows ?? [])];
    let hoursIndex = -1;
    let cedulaIndex = -1;
    let headerRowIndex = -1;
    // Buscar AMBAS columnas (cédula y horas) en todas las filas de encabezado.
    // No se puede hacer return temprano porque la columna de horas puede estar
    // en una posición posterior a la cédula (ej: COLUMNA 3 vs COLUMNA 31).
    for (let rowIndex = 0; rowIndex < allRows.length; rowIndex += 1) {
      const row = allRows[rowIndex];
      if (!row) continue;
      Array.from(row.cells).forEach((cell, cellIndex) => {
        const text = (cell.textContent ?? '').trim();
        if (cedulaIndex === -1 && isCedulaHeader(text)) {
          cedulaIndex = cellIndex;
          headerRowIndex = rowIndex;
        }
        if (hoursIndex === -1 && sameHeader(text, HOURS_COLUMN_NAME)) {
          hoursIndex = cellIndex;
        }
      });
    }
    if (hoursIndex === -1 || cedulaIndex === -1) continue;
    for (let i = headerRowIndex + 1; i < allRows.length; i += 1) {
      const row = allRows[i];
      if (!row) continue;
      const cedulaCell = row.cells[cedulaIndex];
      if (cedulaCell && (cedulaCell.textContent ?? '').trim() === cedula.trim()) {
        const target = row.cells[hoursIndex];
        if (target) {
          target.textContent = String(hoursCellValue(hours));
          target.style.backgroundColor = background;
          target.style.color = '#ffffff';
          target.style.fontWeight = '700';
        }
        return;
      }
    }
  }
}
