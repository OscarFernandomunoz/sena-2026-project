import type { FileUploadState } from '../../types.js';
import { refreshExcelPreview, type FileElements } from '../excel-preview.js';
import { editOriginalWorkbookMultiple } from './exceljs-edit.js';
import { rebuildFromRowsMultiple } from './xls-rebuild.js';
import { HOURS_THRESHOLD } from './helpers.js';
import { colorHoursCellInPreview } from './preview-color.js';
import * as XLSX from 'xlsx';

// Cuenta las filas con datos en un archivo Excel para depuración.
function countRows(buffer: ArrayBuffer): number {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    let maxRows = 0;
    for (const name of wb.SheetNames) {
      const sheet = wb.Sheets[name];
      if (!sheet) continue;
      const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
      maxRows = Math.max(maxRows, range.e.r + 1);
    }
    return maxRows;
  } catch {
    return -1;
  }
}

export interface InstructorResult {
  identification: string;
  totalHours: string | null;
}

// Anota las horas de TODOS los instructores con color rojo/verde y refresca la
// vista previa. Siempre conserva el diseño del archivo original subido; solo se
// negocia la ruta (Excel COM, ExcelJS directo o reconstrucción como último recurso).
export async function writeHoursIntoExcel(
  results: InstructorResult[],
  elements: FileElements,
  state: FileUploadState,
): Promise<boolean> {
  console.log('[AIA][Excel] writeHoursIntoExcel:', results.length, 'resultado(s), archivo=', state.file?.name);
  if (!state.file) {
    console.warn('[AIA][Excel] No hay archivo cargado en state.');
    return false;
  }
  const targets = results.filter((r): r is { identification: string; totalHours: string } => Boolean(r.totalHours));
  if (targets.length === 0) {
    console.warn('[AIA][Excel] No hay horas para aplicar.');
    elements.statusMessage.textContent = 'No hay horas para aplicar. No se modificó el archivo.';
    return false;
  }

  const originalBuffer = await state.file.arrayBuffer();
  console.log('[AIA][Excel] Buffer inicial:', originalBuffer.byteLength, 'bytes, filas:', countRows(originalBuffer));

  // Intentar aplicar TODAS las horas en una sola pasada con ExcelJS (preserva todas las filas)
  let updatedBuffer: ArrayBuffer | null = null;
  let usedRoute: 'exceljs' | 'rebuild' | null = null;
  const notFound: string[] = [];

  try {
    updatedBuffer = await editOriginalWorkbookMultiple(originalBuffer, targets);
    if (updatedBuffer) {
      console.log(`[AIA][Excel] Horas aplicadas con ExcelJS. Buffer: ${originalBuffer.byteLength} -> ${updatedBuffer.byteLength} bytes, filas: ${countRows(updatedBuffer)}`);
      usedRoute = 'exceljs';
    }
  } catch (error) {
    console.warn('[AIA][Excel] Error en la ruta ExcelJS; se usará el fallback .xls.', error);
  }

  if (!updatedBuffer) {
    try {
      updatedBuffer = await rebuildFromRowsMultiple(originalBuffer, targets);
      if (updatedBuffer) {
        console.log(`[AIA][Excel] Horas aplicadas con SheetJS. Buffer: ${originalBuffer.byteLength} -> ${updatedBuffer.byteLength} bytes`);
        usedRoute = 'rebuild';
      }
    } catch (error) {
      console.warn('[AIA][Excel] Falló la reconstrucción del archivo.', error);
    }
  }

  if (!updatedBuffer) {
    console.warn('[AIA][Excel] No se pudieron aplicar horas.');
    elements.statusMessage.textContent = 'No se pudieron aplicar las horas. No se modificó el archivo.';
    return false;
  }

  const baseName = state.file.name.replace(/\.[^.]+$/, '');
  const ext = usedRoute === 'rebuild' ? '.xlsx' : (state.file.name.match(/\.[^.]+$/)?.[0] ?? '.xlsx');
  const isXls = ext.toLowerCase() === '.xls';
  console.log(`[AIA][Excel] Buffer final: ${updatedBuffer.byteLength} bytes, ruta: ${usedRoute}`);
  const updatedFile = new File([updatedBuffer], `${baseName}-actualizado${ext}`, {
    type: isXls ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  console.log('[AIA][Excel] Archivo generado, refrescando vista previa...');
  state.file = updatedFile;
  await refreshExcelPreview(updatedFile, elements, state);
  for (const { identification, totalHours } of targets) {
    colorHoursCellInPreview(elements, identification, totalHours);
  }
  console.log('[AIA][Excel] Vista previa refrescada y coloreada.');

  const notFoundNote = notFound.length > 0 ? ` Sin coincidencia en el Excel: ${notFound.join(', ')}.` : '';
  const preservedDesign = usedRoute === 'exceljs';
  elements.statusMessage.textContent = preservedDesign
    ? `Horas escritas para ${targets.length - notFound.length} instructor(es) con color (rojo < ${HOURS_THRESHOLD}, verde ≥ ${HOURS_THRESHOLD}). Diseño y filtros conservados.${notFoundNote} Archivo: ${updatedFile.name}.`
    : `Horas escritas para ${targets.length - notFound.length} instructor(es). Aviso: el archivo era .xls y se reconstruyó, así que pudo perder el diseño/filtros.${notFoundNote} Archivo: ${updatedFile.name}.`;
  return true;
}


