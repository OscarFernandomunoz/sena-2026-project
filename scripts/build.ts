import * as esbuild from 'esbuild';
import { rmSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const rootDir: string = process.cwd();
const isDev: boolean = process.argv.includes('--watch');

async function build(): Promise<void> {
  console.time('⚡ Build completado en');

  // 1. Limpiar directorio dist/
  rmSync(resolve(rootDir, 'dist'), { recursive: true, force: true });

  // 2. Verificación de tipos estricta sin emitir JS
  console.log('🔍 Verificando tipos con tsc...');
  try {
    execSync('npx tsc --noEmit', { cwd: rootDir, stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error de tipos detectado en TypeScript. ' + error);
    process.exit(1);
  }

  // 3. Copia de archivos estáticos seguras
  console.log('📁 Copiando archivos estáticos...');
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

  const publicImages: string[] = ['sofia-plus.svg', 'sofia-plus.png'];
  for (const img of publicImages) {
    const srcPath = resolve(rootDir, 'public/images', img);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, resolve(distImagesDir, img));
    }
  }

  // 4. Configuración compartida con tipo estricto de esbuild
  const sharedConfig: esbuild.BuildOptions = {
    bundle: true,
    minify: !isDev,
    sourcemap: true,
    tsconfig: resolve(rootDir, 'tsconfig.json'),
  };

  // 5. Especificación por proceso de Electron
  const mainConfig: esbuild.BuildOptions = {
    ...sharedConfig,
    entryPoints: [resolve(rootDir, 'src/main/index.ts')],
    outfile: resolve(rootDir, 'dist/main/index.cjs'), // <-- .cjs
    platform: 'node',
    target: 'node20',
    format: 'cjs', // <-- CommonJS para evitar errores en Main
    external: ['electron'],
  };

  const preloadConfig: esbuild.BuildOptions = {
    ...sharedConfig,
    entryPoints: [resolve(rootDir, 'src/preload/index.ts')],
    outfile: resolve(rootDir, 'dist/preload/index.cjs'), // <-- .cjs
    platform: 'node',
    target: 'node20',
    format: 'cjs', // <-- CommonJS para evitar errores en Preload
    external: ['electron'],
  };

  const rendererConfig: esbuild.BuildOptions = {
    ...sharedConfig,
    entryPoints: [resolve(rootDir, 'src/renderer/index.ts')],
    outfile: resolve(rootDir, 'dist/renderer/index.js'), // <-- .js
    platform: 'browser',
    target: 'chrome120',
    format: 'esm', // <-- ESM nativo para Chromium
  };

  // 6. Bundling paralelo multitarea
  console.log('📦 Empaquetando Main, Preload y Renderer...');
  try {
    await Promise.all([
      esbuild.build(mainConfig),
      esbuild.build(preloadConfig),
      esbuild.build(rendererConfig),
    ]);
    console.timeEnd('⚡ Build completado en');
  } catch (error) {
    console.error('❌ Error durante la compilación con esbuild:', error);
    process.exit(1);
  }
}

build();
