var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');
var koaBody = require('koa-body')();
var casing = require('casing');
var logger = require('./logger.js');
var _ = require('lodash');


router.get('/list', function *(next) {
    var model = models.SPU;
    var totalCount = yield model.count();

    this.query = casing.camelize(this.query);
    if (this.query.perPage && this.query.page) {
        var perPage = parseInt(this.query.perPage);
        var page = parseInt(this.query.page);
        model.query(function (q) {
            q.offset((page - 1) * perPage).limit(perPage);
        });
    }

    this.body = {
        data: yield model.fetchAll({
            withRelated: ['spuType', 'vendor']
        }).then(function (c) {
            return c.map(function (item) {
                return function *addPicPaths() {
                    console.log(item);
                    return _.assign(item, {
                        picPaths: yield item.getPicPaths(),
                    });
                };
            });
        }),
        totalCount: totalCount,
    };
});

module.exports = {
    app: koa().use(json())
    .use(router.routes())
    .use(router.allowedMethods()),
};
