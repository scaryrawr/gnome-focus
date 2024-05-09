import typescript from '@rollup/plugin-typescript';

const config = ['src/extension.ts', 'src/prefs.ts'].map(input => ({
  input,
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
