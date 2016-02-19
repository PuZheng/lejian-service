var koa = require('koa');
var json = require('koa-json');
var router = require('koa-router')();
var koaBody = require('koa-body')();
var models = require('./models.js');
var _ = require('lodash');

router.post('/object', koaBody, function *(next) {
    var denounce = yield models.Denounce.forge(_.assign(this.request.body, {
        user_id: this.state.user && this.state.user.id,
    })).save();
    this.body = denounce.toJSON();
    yield next;
})

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
