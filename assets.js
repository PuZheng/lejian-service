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
var cofy = require('cofy');

router.post('/', function *(next) {
    var parts = parse(this);
    var part;
    var filenames = [];
    var paths = [];
    while ((part = yield parts)) {
        if (!part.length) {
            // part is stream
            var extname = path.extname(part.filename);
            var dir = path.join(__dirname, 'assets/tmp');
            yield utils.assertDir(dir);
            var path_ = yield cofy.fn(tmp.tmpName)({ dir: dir, postfix: extname, prefix: '' });
            var stream = fs.createWriteStream(path_);
            logger.info('uploading %s', stream.path);
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
