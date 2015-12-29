var koa = require('koa');
var json = require('koa-json');
var router = require('koa-router')();
var logger = require('./logger.js');
var models = require('./models.js');
var casing = require('casing');
var cofy = require('cofy');
var knex = require('./knex.js');
var bookshelf = require('bookshelf')(knex);
var koaBody = require('koa-body')();

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
}).delete('/list', function *(next) {
    var ids = this.query.ids.split(',');
    var t = yield cofy.fn(bookshelf.transaction, false, bookshelf)();
    yield ids.map(function (id) {
        return models.SKU.forge({ id: id }).destroy({
            transacting: t,
        });
    });
    try {
        yield t.commit();
    } catch (e) {
        yield t.rollback();
        throw e;
    }
    this.body = {};
    yield next;
}).post('/object', koaBody, function *(next) {
    var item = yield models.SKU.forge(casing.snakeize(this.request.body)).save();
    this.body = item.toJSON();
}).get('/object/:id', function *(next) {
    this.body = (yield models.SKU.forge({ id: this.params.id }).fetch({ withRelated: [ 'spu' ] })).toJSON();
    yield next;
});

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
