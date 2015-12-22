var koa = require('koa');
var error = require('koa-error');
var cors = require('koa-cors');
var config = require('./config.js');
var koaLogger = require('koa-bunyan');
var logger = require('./logger.js');
var mount = require('koa-mount');
var fs = require('fs');
var jwt = require('koa-jwt');

if (require.main === module) {
    fs.readFile(config.get('publicKey'), function (err, secret) {
        var app = koa();
        app.use(error())
        .use(jwt({
            secret: secret,
            algorithm: 'RS256',
        }).unless(function () {
            return !config.get('jwtEnabled') || (
                this.method === 'OPTIONS' || 
                this.url.match(/^\/auth/) ||
                (this.url.match(/^\/assets/) && this.method === 'GET')
            );
        }))
        .use(cors())
        .use(koaLogger(logger, {
            // which level you want to use for logging?
            // default is info
            level: 'info',
            // this is optional. Here you can provide request time in ms,
            // and all requests longer than specified time will have level 'warn'
            timeLimit: 100
        }))
        .use(mount('/assets', require('./assets.js').app))
        .use(mount('/auth', require('./auth.js').app))
        .use(mount('/spu-type', require('./spu-type.js').app));
        app.listen(config.get('port'));
    });
}
