var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');
var koaBody = require('koa-body')();
var casing = require('casing');
var utils = require('./utils.js');
var path = require('path');

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
}).put('/object.json', koaBody, function *(next) {
    var picPath = request.body.picPath;
    if (picPath) {
        dir = path.join(config.get('assetDir'), 'spu_type_pics');
        yield utils.assertDir(dir);
        request.body.picPath = yield utils.formalizeTempAsset(dir, picPath);
    }
    this.body = (yield models.SPUType.forge(casing.snakeize(request.body)).save()).toJSON();
});


module.exports = {
    app: koa().use(json())
    .use(router.routes())
    .use(router.allowedMethods())
};
