import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { APPLY_HOURS_MULTIPLE_PS1 } from './excel-com-multiple-script.js';

const execFileAsync = promisify(execFile);

export interface ApplyHoursMultiplePayload {
  data: ArrayBuffer | Uint8Array;
  fileName: string;
  targets: Array<{ identification: string; totalHours: string }>;
}

// Aplica las horas a TODAS las cédulas en una sola pasada usando Excel real vía COM
// (PowerShell), de modo que la copia descargada conserve idéntico el diseño y los
// filtros del archivo original. Devuelve el contenido del archivo modificado, o null
// si Excel no está disponible o ninguna cédula se encontró.
export async function applyHoursMultipleWithExcel(payload: ApplyHoursMultiplePayload): Promise<Buffer | null> {
  const dir = mkdtempSync(join(tmpdir(), 'aia-excel-'));
  const inPath = join(dir, payload.fileName.replace(/[^\w.-]/g, '_'));
  const ext = payload.fileName.match(/\.[^.]+$/)?.[0] ?? '.xlsx';
  const outPath = join(dir, payload.fileName.replace(/\.[^.]+$/, '') + '-actualizado' + ext);
  const scriptPath = join(dir, 'apply-hours-multiple.ps1');
  writeFileSync(inPath, Buffer.from(payload.data as ArrayBuffer));
  writeFileSync(scriptPath, '\uFEFF' + APPLY_HOURS_MULTIPLE_PS1, 'utf8');
  const targetsParam = payload.targets.map((t) => `${t.identification}|${t.totalHours}`).join(';');
  try {
    await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-InPath', inPath, '-OutPath', outPath, '-Targets', targetsParam],
      { timeout: 120000 },
    );
  } catch (error) {
    const err = error as { code?: number | string; stderr?: string; message?: string };
    console.warn(`[AIA][Excel] PowerShell COM múltiple falló (código ${String(err.code)}). Se usará el fallback.`);
    if (err.stderr) console.warn(`[AIA][Excel] stderr: ${err.stderr.slice(0, 500)}`);
    if (err.message) console.warn(`[AIA][Excel] message: ${err.message.slice(0, 500)}`);
    return null;
  }
  try {
    const result = readFileSync(outPath);
    console.log(`[AIA][Excel] COM múltiple: archivo modificado leído, ${result.length} bytes (original: ${payload.data.byteLength} bytes)`);
    return result;
  } catch {
    console.warn('[AIA][Excel] No se generó el archivo de salida.');
    return null;
  }
}
