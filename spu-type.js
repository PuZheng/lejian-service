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

router.get('/list', function *(next) {
    var c = (yield models.SPUType.fetchAll());
    var data = (yield c.map(function (spuType) {
        var json = spuType.toJSON();
        return function *() {
            json.spuCnt = yield spuType.getSpuCnt();
            return json;
        };
    }));
     
    this.body = {
        data: data,
    };
    yield next;
}).post('/object', koaBody, function *(next) {
    var picPath = this.request.body.picPath;
    if (picPath) {
        delete this.request.body.picPath;
    }
    var item;
    try {
        item = yield models.SPUType.forge(casing.snakeize(this.request.body)).save();
    } catch (e) {
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
    if (picPath) {
        dir = path.join(config.get('assetDir'), 'spu_type_pics');
        yield utils.assertDir(dir);
        yield fs.rename(picPath, path.join(dir, item.get('id') + '.jpg'));
    }
    this.body = item.toJSON();
}).get('/object/:id', function *(next) {
    try {
        var spuType = yield models.SPUType.forge({ id: this.params.id }).fetch({ require: true });
        var spuCnt = yield spuType.getSpuCnt();
        this.body = spuType.toJSON();
        this.body.spuCnt = spuCnt;
    } catch (e) {
        if (e.message != 'EmptyResponse') {
            throw e;
        }
        this.status = 404;
    }
}).put('/object/:id', koaBody, function *(next) {
    try {
        var spuType = yield models.SPUType.forge({ id: this.params.id }).fetch({ require: true });
        var picPath = this.request.body.picPath;
        if (picPath) {
            delete this.request.body.picPath;
        }
        spuType = yield spuType.save(casing.snakeize(this.request.body));
        if (picPath) {
            yield fs.rename(picPath, path.join(config.get('assetDir'), 'spu_type_pics', 
                                               spuType.get('id') + '.jpg'));
        }
        this.body = spuType.toJSON();
        this.body.spuCnt = yield spuType.getSpuCnt();
    } catch (e) {
        if (e.message != 'EmptyResponse') {
            throw e;
        }
        this.status = 404;
    }
});


module.exports = {
    app: koa().use(json())
    .use(router.routes())
    .use(router.allowedMethods())
};

