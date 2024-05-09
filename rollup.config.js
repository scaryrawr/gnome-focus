import typescript from '@rollup/plugin-typescript';

const config = ['src/extensions.ts', 'src/prefs.ts'].map(file => ({
  input: 'src/extension.ts',
  external: [/gi:\/\/.*/, /resource:\/\/.*/],
  output: {
    dir: 'dist',
    format: 'es'
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json'
    })
  ]
}));

export default config;
