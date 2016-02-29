var fs = require('fs');

function clearDB() {
    fs.unlink('./db', function (err) {
        if (err) {
            if (err.code != 'ENOENT') {
                throw err; 
            }
            console.log('no such db');
        }
    });
}
module.exports = clearDB;

if (require.main === module) {
    clearDB();
}
