import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { APPLY_HOURS_PS1 } from './excel-com-script.js';

const execFileAsync = promisify(execFile);

export interface ApplyHoursPayload {
  data: ArrayBuffer | Uint8Array;
  fileName: string;
  cedula: string;
  hours: string;
}

// Aplica las horas al archivo usando Excel real vía COM (PowerShell), de modo que la
// copia descargada conserve idéntico el diseño y los filtros del archivo original.
// Devuelve el contenido del archivo modificado, o null si Excel no está disponible
// o la cédula no se encontró (el llamador decide el fallback).
export async function applyHoursWithExcel(payload: ApplyHoursPayload): Promise<Buffer | null> {
  const dir = mkdtempSync(join(tmpdir(), 'aia-excel-'));
  const inPath = join(dir, payload.fileName.replace(/[^\w.-]/g, '_'));
  const ext = payload.fileName.match(/\.[^.]+$/)?.[0] ?? '.xlsx';
  const outPath = join(dir, payload.fileName.replace(/\.[^.]+$/, '') + '-actualizado' + ext);
  const scriptPath = join(dir, 'apply-hours.ps1');
  writeFileSync(inPath, Buffer.from(payload.data as ArrayBuffer));
  // PowerShell 5.1 interpreta el archivo como ANSI salvo que lleve BOM; sin él,
  // los acentos del script se corrompen y el flujo COM falla al parsear.
  writeFileSync(scriptPath, '\uFEFF' + APPLY_HOURS_PS1, 'utf8');
  try {
    await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-InPath', inPath, '-OutPath', outPath, '-Cedula', payload.cedula, '-Hours', payload.hours],
      { timeout: 120000 },
    );
  } catch (error) {
    const exitCode = (error as { code?: number | string }).code;
    console.warn(`[AIA][Excel] PowerShell COM falló (código ${String(exitCode)}). Se usará el fallback.`);
    return null;
  }
  try {
    return readFileSync(outPath);
  } catch {
    console.warn('[AIA][Excel] No se generó el archivo de salida.');
    return null;
  }
}
