
console.log('START: Debugging imports in cli/next-build.js');
try {
    console.log('Importing build...');
    require("next/dist/build");
    console.log('Importing build/output/log...');
    require("next/dist/build/output/log");
    console.log('Importing server/lib/utils...');
    require("next/dist/server/lib/utils");
    console.log('Importing lib/is-error...');
    require("next/dist/lib/is-error");
    console.log('Importing lib/get-project-dir...');
    require("next/dist/lib/get-project-dir");
    console.log('Importing lib/memory/startup...');
    require("next/dist/lib/memory/startup");
    console.log('Importing lib/memory/shutdown...');
    require("next/dist/lib/memory/shutdown");
    console.log('Importing lib/bundler...');
    require("next/dist/lib/bundler");
    console.log('Importing lib/resolve-build-paths...');
    require("next/dist/lib/resolve-build-paths");
    console.log('ALL IMPORTS SUCCESS');
} catch (e) {
    console.error('CRASH:', e);
}
