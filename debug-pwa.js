
try {
    const pwa = require("@ducanh2912/next-pwa");
    console.log('Type of pwa:', typeof pwa);
    console.log('pwa keys:', Object.keys(pwa));
    console.log('Type of pwa.default:', typeof pwa.default);
} catch (e) {
    console.error(e);
}
