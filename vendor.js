var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');


router.get('/list', function *(next) {
    this.body = {
        data: (yield models.Vendor.fetchAll()).toJSON(),
    };
    yield next;
});

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
