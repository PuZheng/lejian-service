var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');
var logger = require('./logger.js');
var casing = require('casing');
var _ = require('lodash');

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
            return _.assign(retailer.toJSON(), {
                pic: retailer.picPath(),
                spuCnt: yield retailer.getSPUCnt()
            });
        };
    }));

    this.body = {
        totalCnt: totalCnt,
        data: data,
    };
    yield next;
});

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
