import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const USE_CLIENT = '"use client";\n';

function prependUseClient(dir: string, files: string[]) {
  for (const file of files) {
    const path = resolve(dir, file);
    try {
      const content = readFileSync(path, 'utf-8');
      if (!content.startsWith('"use client"') && !content.startsWith("'use client'")) {
        writeFileSync(path, USE_CLIENT + content);
      }
    } catch { /* file may not exist yet */ }
  }
}

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    minify: false,
    splitting: false,
    treeshake: true,
    target: 'es2020',
  },
  {
    entry: ['src/react/index.tsx'],
    outDir: 'dist/react',
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    minify: false,
    splitting: false,
    treeshake: true,
    target: 'es2020',
    external: ['react', 'react-dom'],
    onSuccess: async () => {
      prependUseClient('dist/react', ['index.js', 'index.cjs']);
    },
  },
]);
