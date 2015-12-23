var fs = require('mz/fs');
var path = require('path');

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

var formalizeTempAsset = function *(dir, path_) {
    try {
        yield fs.stat(dir);
        var 
    } catch (e) {
        if (e.code != 'ENOENT') {
            throw e;
        }
        var ext = path.extname(path_);
    }
    if path(path_).exists():
        _, ext = path(path_).splitext()
        new_path = tempfile.mktemp(suffix=ext, dir=dir_, prefix='')
        shutil.move(path_, new_path)
        return new_path
};

module.exports = {
    assertDir: assertDir,
    formalizeTempAsset: formalizeTempAsset,
};


