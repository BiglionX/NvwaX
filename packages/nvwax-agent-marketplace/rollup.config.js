import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
  // Main bundle (UMD for browser compatibility)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'umd',
      name: 'NvwaXAgentMarketplace',
      sourcemap: true
    },
    plugins: [
      resolve(),
      typescript({ tsconfig: './tsconfig.json' })
    ]
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
      resolve(),
      typescript({ tsconfig: './tsconfig.json' })
    ]
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
