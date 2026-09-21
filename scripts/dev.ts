import * as esbuild from 'esbuild';
import { rmSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import electronPath from 'electron';

const rootDir: string = process.cwd();
let electronProcess: ChildProcess | null = null;

// 1. Copia assets estáticos del Renderer (HTML, CSS e imágenes)
function copyStaticAssets(): void {
  const distRendererDir = resolve(rootDir, 'dist/renderer');
  const distImagesDir = resolve(distRendererDir, 'images');

  mkdirSync(distImagesDir, { recursive: true });

  const htmlSrc = resolve(rootDir, 'src/renderer/index.html');
  if (existsSync(htmlSrc)) {
    copyFileSync(htmlSrc, resolve(distRendererDir, 'index.html'));
  }

  const cssSrc = resolve(rootDir, 'src/renderer/style.css');
  if (existsSync(cssSrc)) {
    copyFileSync(cssSrc, resolve(distRendererDir, 'style.css'));
  }

  const publicImagesDir = resolve(rootDir, 'public/images');
  if (existsSync(publicImagesDir)) {
    // Si tienes imágenes estáticas en public/images, se copian a dist/renderer/images
    const imagesToCopy = ['sofia-plus.svg', 'sofia-plus.png'];
    for (const img of imagesToCopy) {
      const srcPath = resolve(publicImagesDir, img);
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, resolve(distImagesDir, img));
      }
    }
  }
}

// 2. Controla la ejecución del proceso de Electron
function startElectron(): void {
  if (electronProcess) {
    electronProcess.removeAllListeners('close');
    electronProcess.kill('SIGTERM');
    electronProcess = null;
  }

  console.log('🚀 Iniciando Electron...');
  electronProcess = spawn(String(electronPath), ['.'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });

  electronProcess.on('close', (code) => {
    // Evitamos cerrar el proceso dev si Electron fue matado deliberadamente para reiniciar
    if (code !== null && code !== 0) {
      console.log(`👋 Electron cerró con código: ${code}`);
    }
  });
}

// 3. Plugin de esbuild para detectar cambios en TypeScript y reiniciar Electron
const reloadElectronPlugin = (name: string): esbuild.Plugin => ({
  name: `reload-electron-${name}`,
  setup(build) {
    let isFirstBuild = true;
    build.onEnd((result) => {
      if (result.errors.length > 0) {
        console.error(`❌ Error recompilando ${name}:`, result.errors);
        return;
      }

      console.log(`⚡ Recompilación exitosa de ${name}`);

      if (isFirstBuild) {
        isFirstBuild = false;
      } else {
        console.log(`🔄 Cambio detectado en ${name} (.ts). Reiniciando Electron...`);
        startElectron();
      }
    });
  },
});

// 4. Función principal de compilación y observación
async function dev(): Promise<void> {
  console.log('🧹 Limpiando carpeta dist/...');
  rmSync(resolve(rootDir, 'dist'), { recursive: true, force: true });

  console.log('📁 Copiando archivos estáticos...');
  copyStaticAssets();

  const sharedConfig: esbuild.BuildOptions = {
    bundle: true,
    minify: false,
    sourcemap: 'inline',
    tsconfig: resolve(rootDir, 'tsconfig.json'),
  };

  // --- COMPILACIÓN Y WATCH DE MAIN (.ts -> .js) ---
  const mainCtx = await esbuild.context({
    ...sharedConfig,
    entryPoints: [resolve(rootDir, 'src/main/index.ts')],
    outfile: resolve(rootDir, 'dist/main/index.js'),
    platform: 'node',
    target: 'node20',
    format: 'esm',
    external: ['electron'],
    plugins: [reloadElectronPlugin('Main')],
  });

  // --- COMPILACIÓN Y WATCH DE PRELOAD (.ts -> .js) ---
  const preloadCtx = await esbuild.context({
    ...sharedConfig,
    entryPoints: [resolve(rootDir, 'src/preload/index.ts')],
    outfile: resolve(rootDir, 'dist/preload/index.js'),
    platform: 'node',
    target: 'node20',
    format: 'esm',
    external: ['electron'],
    plugins: [reloadElectronPlugin('Preload')],
  });

  // --- COMPILACIÓN Y WATCH DE RENDERER (.ts -> .js) ---
  const rendererCtx = await esbuild.context({
    ...sharedConfig,
    entryPoints: [resolve(rootDir, 'src/renderer/index.ts')],
    outfile: resolve(rootDir, 'dist/renderer/index.js'),
    platform: 'browser',
    target: 'chrome120',
    format: 'esm',
  });

  console.log('👀 Observando cambios en archivos TypeScript (src/**/*.ts)...');
  await Promise.all([
    mainCtx.watch(),
    preloadCtx.watch(),
    rendererCtx.watch(),
  ]);

  // Primera ejecución de Electron
  startElectron();
}

dev().catch((err) => {
  console.error('❌ Error al iniciar el entorno de desarrollo:', err);
  process.exit(1);
});
