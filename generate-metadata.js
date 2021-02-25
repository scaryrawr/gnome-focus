const meta = require('./metadata.json');
const package_info = require('./package.json');
const fs = require('fs');

// Use min version number for tracking version
meta.version = parseInt(package_info.version.split('.')[1], 10);
meta.description = package_info.description;
fs.writeFileSync('./dist/metadata.json', JSON.stringify(meta, null, 2));
