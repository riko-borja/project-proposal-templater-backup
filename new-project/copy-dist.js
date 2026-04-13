// copy-dist.js
const cpx = require('cpx');
const path = require('path');
const notifier = require('node-notifier'); // Optional: Remove if not using notifications

console.log('Starting copy-dist.js');

const source = path.resolve(__dirname, 'dist/**/*');
const destination = 'C:/Users/rikog/modified front ends october 2024/new-node-project/dist';

console.log(`Source path: ${source}`);
console.log(`Destination path: ${destination}`);

cpx.copy(source, destination, (err) => {
    if (err) {
        console.error('Error copying dist folder:', err.message);
        notifier.notify({
            title: 'Build Process',
            message: 'Error copying dist folder!'
        });
        process.exit(1); // Exit with failure
    } else {
        console.log('dist folder copied successfully!');
        notifier.notify({
            title: 'Build Process',
            message: 'dist folder copied successfully!'
        });
    }
});
