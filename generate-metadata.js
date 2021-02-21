const meta = require('./metadata.json');
const pkginfo = require('./package.json');
const fs = require('fs');

// Use min version number for tracking version
meta.version = parseInt(pkginfo.version.split('.')[1], 10);
fs.writeFileSync('./dist/metadata.json', JSON.stringify(meta, null, 2));
