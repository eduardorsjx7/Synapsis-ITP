import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';  // Alterando a importação do terser para padrão

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.umd.js',
    format: 'umd',
    name: 'dashboardKit',
    globals: {
      echarts: 'echarts',
    },
  },
  external: ['echarts', '@tanstack/table-core'],
  plugins: [resolve(), commonjs(), terser()],  // Adicionando o terser aqui
};
