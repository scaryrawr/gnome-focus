import { existsSync, rmSync } from 'fs';

if (existsSync('./dist')) {
  rmSync('./dist', { recursive: true });
}

if (existsSync('./schemas/gschemas.compiled')) {
  rmSync('./schemas/gschemas.compiled');
}

if (existsSync('./focus@scaryrawr.github.io.zip')) {
  rmSync('./focus@scaryrawr.github.io.zip');
}
