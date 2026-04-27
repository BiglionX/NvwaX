import rollupTypescript from '@rollup/plugin-typescript';
import rollupResolve from '@rollup/plugin-node-resolve';
import rollupCommonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';

export default [
  // Main bundle (CommonJS)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      rollupResolve(),
      rollupCommonjs(),
      rollupTypescript({ tsconfig: './tsconfig.json' })
    ],
    external: ['axios']
  },
  // ESM bundle
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.mjs',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      rollupResolve(),
      rollupCommonjs(),
      rollupTypescript({ tsconfig: './tsconfig.json' })
    ],
    external: ['axios']
  },
  // Type definitions
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  }
];
