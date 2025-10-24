const fs = require('fs');
const path = './logs.txt';

module.exports = {
    log: (message) => {
        const date = new Date().toISOString();
        fs.appendFileSync(path, `[${date}] ${message}\n`);
        console.log(`[LOG] ${message}`);
    }
};
