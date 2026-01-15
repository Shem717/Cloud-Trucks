const buildModule = require('next/dist/build');
const interopRequireDefault = (obj) => obj && obj.__esModule ? obj : { default: obj };
const wrappedBuild = interopRequireDefault(buildModule);

console.log('Type of buildModule:', typeof buildModule);
console.log('Keys of buildModule:', Object.keys(buildModule));
console.log('buildModule.default:', buildModule.default);
if (buildModule.default) {
    console.log('Type of buildModule.default:', typeof buildModule.default);
}

console.log('Type of wrappedBuild:', typeof wrappedBuild);
console.log('Keys of wrappedBuild:', Object.keys(wrappedBuild));
console.log('wrappedBuild.default:', wrappedBuild.default);
if (wrappedBuild.default) {
    console.log('Type of wrappedBuild.default:', typeof wrappedBuild.default);
    console.log('wrappedBuild.default.default:', wrappedBuild.default.default);
}
