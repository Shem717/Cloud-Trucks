
try {
    const configModule = require('next/dist/server/config');
    console.log('Type of configModule:', typeof configModule);
    console.log('Keys of configModule:', Object.keys(configModule));
    console.log('Type of configModule.default:', typeof configModule.default);

    if (typeof configModule.default === 'function') {
        console.log('Successfully loaded configModule.default');
    } else {
        console.error('configModule.default is NOT a function');
    }

} catch (error) {
    console.error('Error requiring next/dist/server/config:', error);
}
