var koa = require('koa');
var router = require('koa-router')();
var send = require('koa-send');
var path = require('path');
var config = require('./config.js');
var parse = require('co-busboy');
var logger = require('./logger.js');
var tmp = require('tmp');
var utils = require('./utils.js');
var fs = require('mz/fs');

router.post('/', function *(next) {
    var parts = parse(this);
    var part;
    var filenames = [];
    var paths = [];
    var createWriteStream = function (dir) {
        return new Promise(function (resolve, reject) {
            tmp.file({ dir: dir }, function (err, path_, fd, cb) {
                if (err) {
                    reject(err);
                    return;
                } 
                resolve(fs.createWriteStream(path_));
            });
        });
    };
    while ((part = yield parts)) {
        if (part.length) {
            // part is field
            var key = part[0];
            key === 'x-filenames' && (filenames = JSON.parse(part[1]));
        } else {
            // part is stream
            var filename = filenames.shift() || part.filename;
            var dir = path.join(__dirname, 'assets/tmp');
            utils.assertDir(dir);
            var stream = yield createWriteStream(dir);
            logger.info('uploading %s -> %s', filename, stream.path);
            part.pipe(stream);
            paths.push(stream.path);
        }
    }
    this.body = {
        paths: paths,
    };
    
}).get(/(.*)/, function *(next) {
    try {
        var path_ = path.join(config.get('assetDir'), this.params[0]);
        yield send(this, path_, { root: __dirname });
    } catch (e) {
        if (e.message != 'EmptyResponse') {
            throw e;
        }
        this.status = 404;
    }
});

module.exports = {
    app: koa().use(router.routes()).use(router.allowedMethods())
};
