import * as esbuild from 'esbuild';
import { rmSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const rootDir = process.cwd();
rmSync(resolve(rootDir, 'dist'), { recursive: true, force: true });
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
await Promise.all([
  esbuild.build({
    ...commonConfig,
    entryPoints: [resolve(rootDir, 'src/main/index.ts')],
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: resolve(rootDir, 'dist/main/index.js'),
    external: ['electron'],
  }),
  esbuild.build({
    ...commonConfig,
    entryPoints: [resolve(rootDir, 'src/preload/index.ts')],
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: resolve(rootDir, 'dist/preload/index.js'),
    external: ['electron'],
  }),
  esbuild.build({
    ...commonConfig,
    entryPoints: [resolve(rootDir, 'src/renderer/index.ts')],
    platform: 'browser',
    target: 'esnext',
    format: 'esm',
    outfile: resolve(rootDir, 'dist/renderer/index.js'),
  }),
]);
