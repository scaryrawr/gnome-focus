import { readFileSync, writeFileSync } from 'fs';

const metadata = JSON.parse(readFileSync('./metadata.json'));
const package_info = JSON.parse(readFileSync('./package.json'));

// Use min version number for tracking version
metadata.version = parseInt(package_info.version.split('.')[1], 10);
metadata.description = package_info.description;
writeFileSync('./dist/metadata.json', JSON.stringify(metadata, null, 2));
