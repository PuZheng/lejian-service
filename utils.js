var fs = require('mz/fs');
var path = require('path');
var mkdirp = require('co-mkdirp');

var assertDir = function *(dir) {
    try {
        yield fs.stat(dir);
    } catch (e) {
        if (e.code === 'ENOENT') {
            yield mkdirp(dir);
        } else {
            throw e;
        }
    }
};

module.exports = {
    assertDir: assertDir,
};
