import meta, { version, description } from './metadata.json';
import { version as _version, description as _description } from './package.json';
import { writeFileSync } from 'fs';

// Use min version number for tracking version
version = parseInt(_version.split('.')[1], 10);
description = _description;
writeFileSync('./dist/metadata.json', JSON.stringify(meta, null, 2));
