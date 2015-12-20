var koa = require('koa');
var app = koa();
var error = require('koa-error');
var cors = require('koa-cors');
var config = require('./config.js');
var koaLogger = require('koa-bunyan');
var logger = require('./logger.js');
var mount = require('koa-mount');

if (require.main === module) {
    app.use(error())
    .use(cors())
    .use(koaLogger(logger, {
        // which level you want to use for logging?
        // default is info
        level: 'info',
        // this is optional. Here you can provide request time in ms,
        // and all requests longer than specified time will have level 'warn'
        timeLimit: 100
    }))
    .use(mount('/spu-type', require('./spu-type.js').app));
    app.listen(config.get('port'));
}
