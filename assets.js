var koa = require('koa');
var router = require('koa-router')();
var send = require('koa-send');
var path = require('path');
var config = require('./config.js');

router.get(/(.*)/, function *(next) {
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
