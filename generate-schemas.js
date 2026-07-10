import { cpSync } from 'fs';

cpSync('schemas', 'dist/schemas', { recursive: true });
