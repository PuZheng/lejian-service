var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');
var koaBody = require('koa-body')();
var casing = require('casing');
var logger = require('./logger.js');


router.get('/list', function *(next) {
    this.body = {
        data: (yield models.Vendor.fetchAll()).toJSON(),
    };
    yield next;
}).post('/object', koaBody, function *(next) {
    try {
        var item = yield models.Vendor.forge(casing.snakeize(this.request.body)).save();
        this.body = yield item.toJSON();
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
	yield next;
}).get('/object/:id', function *(next) {
    try {
        var item = yield models.Vendor.forge({ id: this.params.id }).fetch({ require: true });
        this.body = item.toJSON();
    } catch (e) {
        if (e.message != 'EmptyResponse') {
            throw e;
        }
        this.status = 404;
    }
	yield next;
}).put('/object/:id', koaBody, function *(next) {
    try {
        var item = yield models.Vendor.forge({ id: this.params.id }).fetch({ require: true });
        item = yield item.save(casing.snakeize(this.request.body));
        this.body = item.toJSON();
    } catch (e) {
        if (e.message != 'EmptyResponse') {
            throw e;
        }
        this.status = 404;
    }

	yield next;
});

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
