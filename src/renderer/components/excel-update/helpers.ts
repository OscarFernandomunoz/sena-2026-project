export const HOURS_COLUMN_NAME = 'Horas académicas';
export const CEDULA_COLUMN_NAMES = ['Columna 3', '# DE DOCUMENTO'];
export const HOURS_THRESHOLD = 160;
export const GREEN_FILL = 'FF00B050';
export const RED_FILL = 'FFFF0000';

// Convierte el texto del span ("160", "18.36 × 12", etc.) en un número comparable.
export function parseHoursValue(hours: string): number {
  const cleaned = hours.replace(',', '.');
  const parts = cleaned.match(/\d+(?:\.\d+)?/g) ?? [];
  if (parts.length === 0) return Number.NaN;
  return parts.slice(1).reduce((acc, part) => acc * Number(part), Number(parts[0]));
}

// Compara encabezados ignorando acentos y mayúsculas (el Excel puede traer
// "Horas académicas", "HORAS ACADEMICAS", etc.).
export function sameHeader(a: string, b: string): boolean {
  const norm = (s: string): string => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim().toLocaleUpperCase();
  return norm(a) === norm(b);
}

export function isCedulaHeader(text: string): boolean {
  return CEDULA_COLUMN_NAMES.some((name) => sameHeader(text, name));
}

export function findHoursColumn(headerRow: unknown[]): number {
  return headerRow.findIndex((cell) => sameHeader(String(cell ?? ''), HOURS_COLUMN_NAME));
}

// El encabezado puede ocupar dos filas ("COLUMNA 8" arriba y "Horas académicas"
// abajo). Busca la etiqueta en la fila de encabezados y en las dos siguientes.
export function findHoursColumnInBlock(rows: unknown[][], headerRowIndex: number): number {
  for (let r = headerRowIndex; r <= Math.min(headerRowIndex + 2, rows.length - 1); r += 1) {
    const found = findHoursColumn(rows[r] ?? []);
    if (found !== -1) return found;
  }
  return -1;
}

export function findCedulaColumn(headerRow: unknown[]): number {
  return headerRow.findIndex((cell) => isCedulaHeader(String(cell ?? '')));
}

// Escribe el valor de horas tal como llega del span: número si es plano, si el span
// trae una expresión tipo "24.48 × 12" se calcula el producto, si no, texto.
export function hoursCellValue(hours: string): number | string {
  const num = Number(hours.replace(',', '.'));
  if (Number.isFinite(num) && hours.trim() !== '') return num;
  const parsed = parseHoursValue(hours);
  return Number.isFinite(parsed) ? parsed : hours;
}
