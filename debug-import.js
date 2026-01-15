
console.log('START: Debugging imports in next-build.js');
try {
    console.log('Importing cpu-profile...');
    require("next/dist/server/lib/cpu-profile");
    console.log('Importing fs...');
    const _fs = require("fs");
    console.log('Importing picocolors...');
    const _picocolors = require("next/dist/lib/picocolors");
    console.log('Importing build...');
    // This is the big one:
    const _build = require("next/dist/build");
    console.log('Importing build COMPLETE');
} catch (e) {
    console.error('CRASH:', e);
}
console.log('DONE');
