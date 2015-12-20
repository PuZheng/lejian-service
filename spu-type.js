var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');

router.get('/list.json', function *(next) {
    this.body = {
        data: (yield models.SPUType.fetchAll()).toJSON(),
    };
    yield next;
});


module.exports = {
    app: koa().use(json())
    .use(router.routes())
    .use(router.allowedMethods())
};
