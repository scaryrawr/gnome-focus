import { defineConfig } from 'rolldown';

const BUNDLE_INPUTS = ['src/extension.ts', 'src/prefs.ts'];

export default defineConfig(
  BUNDLE_INPUTS.map(input => ({
    input,
    external: [/^gi:\/\//, /^resource:\/\//],
    output: {
      dir: 'dist',
      format: 'esm'
    }
  }))
);
