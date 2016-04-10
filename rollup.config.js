const typescript = require('rollup-plugin-typescript');
const babel = require('rollup-plugin-babel');
const ts = require('typescript');

module.exports = {
  entry: './src/index.ts',
  dest: 'dist.js',
  
  format: 'iife',
  moduleName: 'uwpfs',
  sourceMap: true,

  plugins: [
    typescript({
    	target: ts.ScriptTarget.ES6,
    	typescript: ts
    }),
    babel()
  ]
};
