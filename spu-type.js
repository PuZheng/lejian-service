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

router.get('/list.json', function *(next) {
    var c = (yield models.SPUType.fetchAll());
    var data = (yield c.map(function (spuType) {
        var json = spuType.toJSON();
        return function *() {
            json.spuType = yield spuType.getSpuCnt();
            return json;
        };
    }));
     
    this.body = {
        data: data,
    };
    yield next;
}).post('/object.json', koaBody, function *(next) {
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
});


module.exports = {
    app: koa().use(json())
    .use(router.routes())
    .use(router.allowedMethods())
};
