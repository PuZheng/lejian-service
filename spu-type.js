var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');

router.get('/list.json', function *(next) {
    var c = (yield models.SPUType.fetchAll());
    var spuCnts = (yield c.map(function (spuType) {
        var json = spuType.toJSON();
        return spuType.getSpuCnt();
    }));
    var data = c.toJSON().map(function (i, idx) {
        i.spuCnt = spuCnts[idx];
        return i;
    });
     
    this.body = {
        data: data,
    };
    yield next;
});


module.exports = {
    app: koa().use(json())
    .use(router.routes())
    .use(router.allowedMethods())
};
