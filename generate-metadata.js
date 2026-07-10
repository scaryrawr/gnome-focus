import { readFileSync, writeFileSync } from 'fs';

const metadata = JSON.parse(readFileSync('./metadata.json'));
const package_info = JSON.parse(readFileSync('./package.json'));

metadata.description = package_info.description;
writeFileSync('./dist/metadata.json', JSON.stringify(metadata, null, 2));
