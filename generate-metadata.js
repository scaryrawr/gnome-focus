import { readFileSync, writeFileSync } from 'fs';

const metadata = JSON.parse(readFileSync('./metadata.json'));
const packageInfo = JSON.parse(readFileSync('./package.json'));

// Use min version number for tracking version
metadata.version = parseInt(packageInfo.version.split('.')[1], 10);
metadata.description = packageInfo.description;
writeFileSync('./dist/metadata.json', JSON.stringify(metadata, null, 2));
