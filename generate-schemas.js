import { cpSync } from 'fs';
import { spawnSync } from 'child_process';

spawnSync('glib-compile-schemas', ['schemas'], { stdio: 'inherit' });
cpSync('schemas', 'dist/schemas', { recursive: true });
