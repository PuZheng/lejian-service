#! /usr/bin/env node
var fs = require('fs');

function clearDB(knex) {
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
