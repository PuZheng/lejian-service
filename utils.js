var fs = require('mz/fs');

var assertDir = function *(dir) {
    try {
        yield fs.stat();
    } catch (e) {
        if (e.code === 'ENOENT') {
            yield mkdirp(dir);
        } else {
            throw e;
        }
    }
};

var formalizeTempAsset = function *(dir) {

};

module.exports = {
    assertDir: assertDir,
    formalizeTempAsset: formalizeTempAsset,
};


