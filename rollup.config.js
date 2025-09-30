import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/dynamic-prices-card.js',
  output: {
    file: 'dist/dynamic-prices-card.js',
    format: 'iife',
    name: 'DynamicPricesCard'
  },
  plugins: [
    resolve(),
    commonjs(),
    terser()
  ]
};