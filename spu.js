var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');
var koaBody = require('koa-body')();
var casing = require('casing');
var logger = require('./logger.js');
var _ = require('lodash');
var urljoin = require('url-join');
var config = require('./config.js');


router.get('/list', function *(next) {
    var query = casing.camelize(this.query);
    var model = models.SPU;

    model = model.query(function (q) {
        query.vendorId && q.where('vendor_id', query.vendorId);
        query.spuTypeId && q.where('spu_type_id', query.spuTypeId);
        query.rating && q.where('rating', query.rating);
        query.kw && q.where(function () {
            this.where('name', 'like', '%%' + query.kw + '%%').orWhere('code', 'like', '%%' + query.kw + '%%');
        });
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

    var c = yield model.fetchAll({
        withRelated: ['spuType', 'vendor']
    });
    var data = yield c.map(function (item) {
        return function *fillPicPaths() {
            var picPaths = yield item.getPicPaths();
            var pics = picPaths.map(function (picPath) {
                return {
                    path: picPath,
                    url: urljoin(config.get('site'), picPath),
                };
            });
            return _.assign(item.toJSON(), {
                picPaths: picPaths,
                pics: pics,
                // TODO this is inappropriate
                icon: pics[0],
            });
        };
    });
    this.body = {
        data: data,
        totalCount: totalCount,
    };
});

exports.app = koa().use(json()).use(router.routes())
.use(router.allowedMethods());
