var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');
var koaBody = require('koa-body')();
var casing = require('casing');
var utils = require('./utils.js');
var path = require('path');
var config = require('./config.js');
var fs = require('mz/fs');
var logger = require('./logger.js');
var _ = require('lodash');
var cofy = require('cofy');
var tmp = require('tmp');

var _jsonify = function *(spuType) {
	return _.assign(spuType.toJSON(), {
		spuCnt: yield spuType.getSpuCnt(),
	});
};

router.get('/list', function *(next) {
    var c = (yield models.SPUType.fetchAll());
    var data = (yield c.map(function (spuType) {
		return _jsonify(spuType);
    }));

    this.body = {
        data: data,
    };
    yield next;
}).post('/object', koaBody, function *(next) {
    var picPath = this.request.body.picPath;
    if (picPath) {
        var dir = path.join(config.get('assetDir'), 'spu_type_pics');
        yield utils.assertDir(dir);
        var targetPath = yield cofy.fn(tmp.tmpName)({
            dir: dir,
            prefix: '',
            postfix: path.extname(picPath)
        });
        yield fs.rename(picPath, targetPath);
        this.request.body.picPath = targetPath;
    }
    try {
        var item = yield models.SPUType.forge(casing.snakeize(this.request.body)).save();
		this.body = yield _jsonify(item);
    } catch (e) {
		// TODO only acceptable when using sqlite
        if (e.code === 'SQLITE_CONSTRAINT') {
            e.message = '名称已经存在';
            this.status = 403;
            this.body = {
                code: e.code,
                message: e.message,
            };
            return;
        }
        throw e;
    }
	yield next;
}).param('id', function *(id, next) {
    this.spuType = yield models.SPUType.forge({ id: id }).fetch();
    if (!this.spuType) {
        return (this.status = 404);
    }
    yield next;
}).get('/object/:id', function *(next) {
    this.body = yield _jsonify(this.spuType);
    yield next;
}).put('/object/:id', koaBody, function *(next) {
    var body = this.request.body;
    var picPath = body.picPath;

    if (picPath) {
        var dir = path.join(config.get('assetDir'), 'spu_type_pics');
        yield utils.assertDir(dir);
        var targetPath = yield cofy.fn(tmp.tmpName)({
            dir: dir,
            prefix: '',
            postfix: path.extname(picPath)
        });
        yield fs.rename(picPath, targetPath);
        body.picPath = targetPath;
    }
    this.spuType = yield this.spuType.save(casing.snakeize(body));
    this.body = yield _jsonify(this.spuType);
	yield next;
});


exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
