var koa = require('koa');
var json = require('koa-json');
var router = require('koa-router')();
var logger = require('./logger.js');
var models = require('./models.js');
var casing = require('casing');

router.get('/list', function *(next) {
    var model = models.SKU;
    query = casing.camelize(this.query);

    model = model.query(function (q) {
        query.unexpiredOnly === '1' && q.where('expire_date', '>', Date.now());
        query.spuId && q.where('spu_id', query.spuId);
    });

    var totalCount = yield model.clone().count();

    model = model.query(function (q) {
        q.orderBy.apply(q, (query.sortBy || 'created_at.desc').split('.'));
        if (query.perPage && query.page) {
            var perPage = parseInt(query.perPage);
            var page = parseInt(query.page);
            q.offset((page - 1) * perPage).limit(perPage);
        }
    });

    this.body = {
        data: (yield model.fetchAll({ withRelated: [ 'spu' ] })).toJSON(),
        totalCount: totalCount,
    };
    yield next;
});

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
