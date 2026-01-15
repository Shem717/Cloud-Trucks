
try {
    const commander = require('next/dist/compiled/commander');
    console.log('Type of commander:', typeof commander);
    console.log('Keys of commander:', Object.keys(commander));
    console.log('commander.Command:', typeof commander.Command);
    if (typeof commander.Command === 'undefined') {
        console.log('commander export seems to be:', commander);
    }
} catch (error) {
    console.error('Error requiring commander:', error);
}
