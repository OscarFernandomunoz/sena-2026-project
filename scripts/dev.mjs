import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { clearTimeout, setTimeout } from 'node:timers';

const rootDir = process.cwd();
const buildScript = resolve(rootDir, 'scripts/build.mjs');
const electronCli = resolve(rootDir, 'node_modules/electron/cli.js');
let electronProcess;
let changeTimer;
let rebuilding = false;
let pendingBuild = false;

function runBuild() {
  return new Promise((resolveBuild) => {
    const buildProcess = spawn(process.execPath, [buildScript], {
      cwd: rootDir,
      stdio: 'inherit',
    });

    buildProcess.on('close', (exitCode) => resolveBuild(exitCode === 0));
  });
}

function startElectron() {
  electronProcess = spawn(process.execPath, [electronCli, '.'], {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

function stopElectron() {
  if (!electronProcess || electronProcess.killed) return;

  electronProcess.kill();
  electronProcess = undefined;
}

async function rebuild() {
  if (rebuilding) {
    pendingBuild = true;
    return;
  }

  rebuilding = true;
  stopElectron();
  const buildSucceeded = await runBuild();

  if (buildSucceeded) {
    startElectron();
  } else {
    console.error('Build failed. Waiting for the next file change.');
  }

  rebuilding = false;
  if (pendingBuild) {
    pendingBuild = false;
    await rebuild();
  }
}

function scheduleRebuild() {
  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => void rebuild(), 150);
}

// Primero compilar el main process con esbuild
console.log('Compilando main process para desarrollo...');
const mainBuildProcess = spawn(process.execPath, [
  'node_modules/esbuild/esbuild',
  'src/main/index.ts',
  '--platform=node',
  '--target=node20',
  '--format=cjs',
  '--outfile=dist/main/index.js',
  '--external=electron',
  '--bundle'
], {
  cwd: rootDir,
  stdio: 'inherit',
});

await new Promise((resolve) => mainBuildProcess.on('close', resolve));

// Compilar preload
console.log('Compilando preload para desarrollo...');
const preloadBuildProcess = spawn(process.execPath, [
  'node_modules/esbuild/esbuild',
  'src/preload/index.ts',
  '--platform=node',
  '--target=node20',
  '--format=cjs',
  '--outfile=dist/preload/index.js',
  '--external=electron',
  '--bundle'
], {
  cwd: rootDir,
  stdio: 'inherit',
});

await new Promise((resolve) => preloadBuildProcess.on('close', resolve));

// Correr el build normal para el renderer
await runBuild();

await rebuild();

const sourceWatcher = watch(resolve(rootDir, 'src'), { recursive: true }, scheduleRebuild);

function shutdown() {
  sourceWatcher.close();
  clearTimeout(changeTimer);
  stopElectron();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
