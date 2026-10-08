import type { FileUploadState } from '../../types.js';
import { refreshExcelPreview, type FileElements } from '../excel-preview.js';
import { editOriginalWorkbook } from './exceljs-edit.js';
import { rebuildFromRows } from './xls-rebuild.js';
import { HOURS_THRESHOLD } from './helpers.js';
import { colorHoursCellInPreview } from './preview-color.js';

export interface InstructorResult {
  identification: string;
  totalHours: string | null;
}

// Anota las horas de TODOS los instructores con color rojo/verde, refresca la vista
// previa y ofrece descargar el archivo modificado. Siempre conserva el diseño del
// archivo original subido; solo se negocia la ruta (Excel COM, ExcelJS directo o
// reconstrucción como último recurso).
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
  if (targets.length === 0) return false;

  let buffer: ArrayBuffer = await state.file.arrayBuffer();
  let updated = false;
  let preservedDesign = true;
  let usedRoute: 'com' | 'exceljs' | 'rebuild' | null = null;
  const notFound: string[] = [];

  for (const { identification, totalHours } of targets) {
    // Primera opción: Excel real vía COM preserva el diseño y los filtros al 100%.
    let next: ArrayBuffer | null = null;
    try {
      next = await window.electronAPI.applyHoursToExcel({ data: buffer, fileName: state.file.name, cedula: identification, hours: totalHours });
      if (next) {
        console.log(`[AIA][Excel] ${identification}: horas aplicadas con Excel COM.`);
        usedRoute = 'com';
      }
    } catch (error) {
      console.warn('[AIA][Excel] Error en la ruta COM; se intentará ExcelJS directo.', error);
    }
    // Segunda opción: ExcelJS sobre el archivo, conservando estilos y filtros.
    if (!next) {
      try {
        next = await editOriginalWorkbook(buffer, identification, totalHours);
        if (next) {
          console.log(`[AIA][Excel] ${identification}: horas aplicadas con ExcelJS.`);
          usedRoute = 'exceljs';
        }
      } catch (error) {
        console.warn('[AIA][Excel] Error en la ruta ExcelJS; se usará el fallback .xls.', error);
      }
    }
    // Último recurso (.xls u otros): reconstruye la hoja; puede perder diseño/filtros.
    if (!next) {
      try {
        next = await rebuildFromRows(buffer, identification, totalHours);
        if (next) {
          console.log(`[AIA][Excel] ${identification}: archivo reconstruido con SheetJS.`);
          preservedDesign = false;
          usedRoute = 'rebuild';
        }
      } catch (error) {
        console.warn('[AIA][Excel] Falló la reconstrucción del archivo.', error);
      }
    }
    if (next && usedRoute === null) usedRoute = 'com';
    if (next) {
      buffer = next;
      updated = true;
    } else {
      notFound.push(identification);
    }
  }

  if (!updated) {
    console.warn('[AIA][Excel] Ninguna cédula coincide con una fila del Excel.');
    return false;
  }

  const baseName = state.file.name.replace(/\.[^.]+$/, '');
  // La ruta COM conserva el formato original; ExcelJS y la reconstrucción generan .xlsx.
  const ext = usedRoute === 'com' ? (state.file.name.match(/\.[^.]+$/)?.[0] ?? '.xlsx') : '.xlsx';
  const isXls = ext.toLowerCase() === '.xls';
  const updatedFile = new File([buffer], `${baseName}-actualizado${ext}`, {
    type: isXls ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  console.log('[AIA][Excel] Archivo generado, refrescando vista previa...');
  state.file = updatedFile;
  await refreshExcelPreview(updatedFile, elements, state);
  for (const { identification, totalHours } of targets) {
    colorHoursCellInPreview(elements, identification, totalHours);
  }
  console.log('[AIA][Excel] Vista previa refrescada y coloreada. Descargando...');

  // Descarga el archivo modificado junto a la vista previa actualizada.
  const url = URL.createObjectURL(updatedFile);
  const link = document.createElement('a');
  link.href = url;
  link.download = updatedFile.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);

  const notFoundNote = notFound.length > 0 ? ` Sin coincidencia en el Excel: ${notFound.join(', ')}.` : '';
  elements.statusMessage.textContent = preservedDesign
    ? `Horas escritas para ${targets.length - notFound.length} instructor(es) con color (rojo < ${HOURS_THRESHOLD}, verde ≥ ${HOURS_THRESHOLD}). Diseño y filtros conservados.${notFoundNote} Archivo: ${updatedFile.name}.`
    : `Horas escritas para ${targets.length - notFound.length} instructor(es). Aviso: el archivo era .xls y se reconstruyó, así que pudo perder el diseño/filtros.${notFoundNote} Archivo: ${updatedFile.name}.`;
  return true;
}
