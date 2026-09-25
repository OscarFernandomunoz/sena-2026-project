// Verifica que las funciones que sofia-plus/index.ts serializa con `.toString()` y ejecuta
// dentro de la página de SofiaPlus siguen siendo autocontenidas: no pueden referenciar nada
// del ámbito del módulo donde fueron declaradas (ni imports, ni constantes de módulo, ni
// helpers externos). Si una de ellas depende de su módulo, la inyección falla en runtime con
// ReferenceError aunque TypeScript y el lint pasen.
//
// Compila los módulos con la MISMA configuración que la entrada `main` de scripts/build.ts y
// evalúa cada función en un contexto nuevo (sin módulos, sin el bundle). La carga se hace en
// un proceso `node` plano a propósito: tsx activa `keepNames` en su transformador y añadiría
// un helper `__name` que no existe en el bundle real, produciendo falsos positivos.
import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'sofia-serialize-'));
const outfile = resolve(dir, 'injected-helpers.js');

// Entry point que reexporta exactamente lo que sofia-plus/index.ts inyecta en la página.
const entry = resolve(dir, 'entry.ts');
writeFileSync(entry, `
export { fillSofiaInputs } from ${JSON.stringify(resolve(root, 'src/main/services/sofia-plus/login.ts'))};
export {
  findConsolidatedTimeOption,
  findInstructorTimeOption,
  findTimeManagementOption,
  openAspiranteOptions,
  selectCurriculumOption,
} from ${JSON.stringify(resolve(root, 'src/main/services/sofia-plus/navigation.ts'))};
export {
  clickInstructorResultLink,
  clickInstructorSearchInput,
  fillInstructorIdentification,
  fillReportDates,
  findInstructorPicker,
  openIdentificationTypeSelect,
  selectCitizenshipId,
} from ${JSON.stringify(resolve(root, 'src/main/services/sofia-plus/report/index.ts'))};
`);

// Misma configuración que la entrada `main` de scripts/build.ts.
await esbuild.build({
  bundle: true,
  minify: !process.argv.includes('--dev'),
  sourcemap: false,
  format: 'esm',
  platform: 'browser',
  target: 'chrome120',
  tsconfig: resolve(root, 'tsconfig.json'),
  external: ['electron'],
  entryPoints: [entry],
  outfile,
});

// Todas las funciones que sofia-plus/index.ts inyecta mediante `.toString()`.
const NAMES = [
  'fillSofiaInputs',
  'openAspiranteOptions',
  'selectCurriculumOption',
  'findTimeManagementOption',
  'findConsolidatedTimeOption',
  'findInstructorTimeOption',
  'fillReportDates',
  'findInstructorPicker',
  'openIdentificationTypeSelect',
  'selectCitizenshipId',
  'fillInstructorIdentification',
  'clickInstructorSearchInput',
  'clickInstructorResultLink',
];

// Proceso node plano: devuelve el texto EXACTO que se inyectará en la página.
const runner = resolve(dir, 'dump.mjs');
writeFileSync(runner, `
const mod = await import(${JSON.stringify(pathToFileURL(outfile).href)});
const out = {};
for (const name of ${JSON.stringify(NAMES)}) out[name] = typeof mod[name] === 'function' ? mod[name].toString() : null;
process.stdout.write(JSON.stringify(out));
`);

const sources = JSON.parse(
  execFileSync(process.execPath, [runner], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }),
) as Record<string, string | null>;

// DOM mínimo: ninguna búsqueda encuentra elementos, que es la ruta que ejercita los
// early-return sin necesitar un navegador real.
const sandbox: Record<string, unknown> = {
  console: { log() {}, warn() {}, error() {} },
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    get forms() { return []; },
  },
  location: { pathname: '/test' },
  setTimeout: () => 0,
  clearTimeout: () => {},
  Event: class { constructor() {} },
  MouseEvent: class { constructor() {} },
  HTMLElement: class {},
  HTMLInputElement: class {},
  HTMLSelectElement: class {},
  HTMLAnchorElement: class {},
  HTMLFormElement: class {},
  Window: class {},
};
sandbox.window = sandbox;
vm.createContext(sandbox);

let failed = 0;
for (const name of NAMES) {
  const source = sources[name];
  if (typeof source !== 'string') {
    console.error(`FALLO  ${name}: no se exporta como funcion`);
    failed += 1;
    continue;
  }
  try {
    // Se compila el texto EXACTO que sofia-plus/index.ts inyecta en la pagina.
    vm.runInContext(`(${source})()`, sandbox, { filename: `${name}.injected.js` });
    console.log(`OK     ${name}  (${source.length} chars inyectados)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isRefError = error instanceof ReferenceError;
    console.error(`FALLO  ${name}: ${isRefError ? 'REFERENCIA A AMBITO EXTERNO -> ' : ''}${message}`);
    failed += 1;
  }
}

console.log(
  failed === 0
    ? `\nLas ${NAMES.length} funciones inyectadas en la pagina son autocontenidas.`
    : `\n${failed} funcion(es) con dependencias externas.`,
);
process.exit(failed === 0 ? 0 : 1);
