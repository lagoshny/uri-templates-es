import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['main/src/index.ts'],
    outDir: 'dist/uri-templates-es',
    format: ['esm'],
    target: 'es2018',

    dts: true,
    sourcemap: true,
    clean: true,

    treeshake: true
});
