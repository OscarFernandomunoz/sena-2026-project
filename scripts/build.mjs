import * as esbuild from 'esbuild';
import { rmSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
rmSync(resolve(rootDir, 'dist'), { recursive: true, force: true });

// Compilar TypeScript sin bundling usando tsc
console.log('Compilando TypeScript con tsc...');
try {
  execSync('npx tsc', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.error('Error compilando TypeScript:', error);
  process.exit(1);
}

const distRendererDir = resolve(rootDir, 'dist/renderer');
const distImagesDir = resolve(distRendererDir, 'images');
if (!existsSync(distRendererDir)) {
  mkdirSync(distRendererDir, { recursive: true });
}
if (!existsSync(distImagesDir)) {
  mkdirSync(distImagesDir, { recursive: true });
}
copyFileSync(
  resolve(rootDir, 'src/renderer/index.html'),
  resolve(distRendererDir, 'index.html')
);
copyFileSync(
  resolve(rootDir, 'src/renderer/style.css'),
  resolve(distRendererDir, 'style.css')
);
copyFileSync(
  resolve(rootDir, 'public/images/sofia-plus.svg'),
  resolve(distImagesDir, 'sofia-plus.svg')
);
copyFileSync(
  resolve(rootDir, 'public/images/sofia-plus.png'),
  resolve(distImagesDir, 'sofia-plus.png')
);

const commonConfig = {
  bundle: true,
  minify: true,
  sourcemap: true,
  tsconfig: resolve(rootDir, 'tsconfig.json'),
};

// Solo compilar renderer con esbuild
await esbuild.build({
  ...commonConfig,
  entryPoints: [resolve(rootDir, 'src/renderer/index.ts')],
  platform: 'browser',
  target: 'esnext',
  format: 'esm',
  outfile: resolve(rootDir, 'dist/renderer/index.js'),
});
