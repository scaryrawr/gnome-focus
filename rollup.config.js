import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import resolve from '@rollup/plugin-node-resolve';

const globals = {
  '@imports/Gjs': 'imports.gi',
  '@imports/Meta-8': 'imports.gi.Meta',
  '@imports/Gio-2.0': 'imports.gi.Gio',
};

const external = ['@girs/.*', 'gi://.*'];

const plugins = [
  typescript({
    tsconfig: 'tsconfig.json',
  }),
  resolve({
    preferBuiltins: false,
  }),
  copy({
    targets: [{ src: 'schemas', dest: 'dist' }],
  }),
];

export default [
  {
    input: 'src/extension.ts',
    output: {
      file: 'dist/extension.js',
      format: 'iife',
      exports: 'default',
      name: 'init',
      globals,
    },
    external,
    plugins,
  },
  {
    input: 'src/prefs.ts',
    output: {
      file: 'dist/prefs.js',
      format: 'iife',
      globals,
      exports: 'default',
      name: 'prefs',
      footer: ['var init = prefs.init;', 'var buildPrefsWidget = prefs.buildPrefsWidget;'].join('\n'),
    },
    external,
    plugins,
  },
];
