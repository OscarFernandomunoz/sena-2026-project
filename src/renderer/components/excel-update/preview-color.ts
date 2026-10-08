import type { FileElements } from '../excel-preview.js';
import { HOURS_COLUMN_NAME, HOURS_THRESHOLD, isCedulaHeader, parseHoursValue, sameHeader } from './helpers.js';

// Pinta la misma celda en la vista previa HTML recorriendo todas las celdas de la tabla,
// sin asumir que la primera fila es el encabezado.
export function colorHoursCellInPreview(elements: FileElements, cedula: string, hours: string): void {
  const value = parseHoursValue(hours);
  const background = Number.isFinite(value) && value < HOURS_THRESHOLD ? '#ff0000' : '#00b050';
  for (const table of elements.excelPreview.querySelectorAll('table')) {
    const allRows = [...(table.tHead ? Array.from(table.tHead.rows) : []), ...Array.from(table.tBodies[0]?.rows ?? [])];
    let hoursIndex = -1;
    let cedulaIndex = -1;
    let headerRowIndex = -1;
    allRows.forEach((row, rowIndex) => {
      if (cedulaIndex !== -1) return;
      Array.from(row.cells).forEach((cell, cellIndex) => {
        const text = (cell.textContent ?? '').trim();
        if (isCedulaHeader(text)) {
          cedulaIndex = cellIndex;
          headerRowIndex = rowIndex;
        }
        if (sameHeader(text, HOURS_COLUMN_NAME)) hoursIndex = cellIndex;
      });
    });
    if (hoursIndex === -1 || cedulaIndex === -1) continue;
    for (let i = headerRowIndex + 1; i < allRows.length; i += 1) {
      const row = allRows[i];
      if (!row) continue;
      const cedulaCell = row.cells[cedulaIndex];
      if (cedulaCell && (cedulaCell.textContent ?? '').trim() === cedula.trim()) {
        const target = row.cells[hoursIndex];
        if (target) {
          target.style.backgroundColor = background;
          target.style.color = '#ffffff';
          target.style.fontWeight = '700';
        }
        return;
      }
    }
  }
}
