var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');
var logger = require('./logger.js');
var casing = require('casing');
var _ = require('lodash');
var koaBody = require('koa-body')();
var path = require('path');
var fs = require('mz/fs');
var config = require('./config.js');

router.get('/list', function *(next) {
    var model = models.Retailer;
    query = casing.camelize(this.query);

    model = model.query(function (q) {
        query.enabledOnly === '1' && q.where('enabled', true);
        query.kw && q.where('name', 'like', '%%' + query.kw + '%%');
    });

    var totalCnt = yield model.clone().count();

    model = model.query(function (q) {
        q.orderBy.apply(q, (query.sortBy || 'created_at.desc').split('.'));
        if (query.perPage && query.page) {
            var perPage = parseInt(query.perPage);
            var page = parseInt(query.page);
            q.offset((page - 1) * perPage).limit(perPage);
        }
    });

    var c = (yield model.fetchAll());
    var data = yield (c.map(function (retailer) {
        return function *() {
            var ret = retailer.toJSON();
            return _.assign(ret, {
                pic: {
                    path: ret.picPath,
                    url: path.join(config.get('site'), ret.picPath),
                },
                spuCnt: yield retailer.getSPUCnt()
            });
        };
    }));

    this.body = {
        totalCnt: totalCnt,
        data: data,
    };
    yield next;
}).post('/object', koaBody, function *(next) {
    this.request.body;
    var picPath = this.request.body.picPath;
    delete this.request.body.picPath;
    var item = (yield models.Retailer.forge(casing.snakeize(this.request.body)).save());

    if (picPath) {
        yield fs.rename(picPath, 
                        path.join(config.get('assetDir'), 'retailer_pics', '' + id + path.extname(picPath)));
    }
    this.body = item.toJSON();
    this.body.pic = {
        path: this.body.picPath,
        url: path.join(config.get('site'), this.body.picPath),
    };
});

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
