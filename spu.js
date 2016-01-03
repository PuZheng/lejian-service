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
var cofy = require('cofy');
var rmdir = require('rmdir');
var knex = require('./knex.js');
var bookshelf = require('bookshelf')(knex);
var path = require('path');
var utils = require('./utils.js');
var mv = require('mv');
var tmp = require('tmp');
var fs = require('mz/fs');


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
                retailerCnt: yield item.getRetailerCnt(),
            });
        };
    });
    this.body = {
        data: data,
        totalCount: totalCount,
    };
    yield next;
}).delete('/list', function *(next) {
    var ids = this.query.ids.split(',');
    var t = yield cofy.fn(bookshelf.transaction, false, bookshelf)();

    var id;
    for (id of ids) {
        yield models.SPU.forge({ id: id }).destroy({
            transacting: t,
        });
    }
    try {
        yield t.commit();
    } catch (e) {
        yield t.rollback();
        throw e;
    }
    for (id of ids) {
        yield cofy.fn(rmdir)(path.join(config.get('assetDir'), 'spu_pics', id));
    }
    this.body = {};
    yield next;
}).post('/object', koaBody, function *(next) {
    var picPaths = this.request.body.picPaths;
    delete this.request.body.picPaths;
    var retailerIds = this.request.body.retailerIds;
    delete this.request.body.retailerIds;

    var item = yield models.SPU.forge(casing.snakeize(this.request.body)).save();
    if (picPaths) {
        dir = path.join(config.get('assetDir'), 'spu_pics', item.get('id') + '');
        yield utils.assertDir(dir);
        for (var picPath of picPaths) {
            
            var tmpName = yield cofy.fn(tmp.tmpName)({
                dir: dir, 
                postfix: path.extname(picPath),
                prefix: '',
            });
            yield fs.rename(picPath, tmpName);
        }
    }
    if (!_.isEmpty(retailerIds)) {
        yield item.retailerList().attach(retailerIds);
    }
    this.body = item.toJSON();
}).get('/object/:id', function *(next) {
    try {
        var item = yield models.SPU.forge({ id: this.params.id }).fetch({ require: true, withRelated: [ 'retailerList' ] });
        var picPaths = yield item.getPicPaths(); 
        this.body = _.assign(item.toJSON(), {
            picPaths: picPaths,
            pics: picPaths.map(function (picPath) {
                return {
                    path: picPath,
                    url: urljoin(config.get('site'), picPath)
                };
            }),
        });
    } catch (e) {
        if (e.message != 'EmptyResponse') {
            throw e;
        }
        this.status = 404;
    }
}).put('/object/:id', koaBody, function *(next) {
    try {
        var spu = yield models.SPU.forge({ id: this.params.id }).fetch({
            require: true,
            withRelated: ['retailerList'],
        });

        var t = yield cofy.fn(bookshelf.transaction, false, bookshelf)();
        var picPaths = this.request.body.picPaths;
        var origPicPaths = yield spu.getPicPaths();
        delete this.request.body.picPaths;
        var retailerIds = this.request.body.retailerIds;
        delete this.request.body.retailerIds;

        if (!_.isEmpty(this.request.body)) {
            spu = yield spu.save(casing.snakeize(this.request.body), { transacting: t });
        }
        if (picPaths) {
            var dir = path.join(config.get('assetDir'), 'spu_pics', spu.get('id') + '');
            var path_;
            for (path_ of picPaths) {
                if (origPicPaths.indexOf(path_) === -1) {
                    var dest = yield cofy.fn(tmp.tmpName)({ 
                        dir: dir, 
                        prefix: '', 
                        postfix: path.extname(path_),
                    });
                    yield fs.rename(path_, dest);
                }
            }
            for (path_ of origPicPaths) {
                if (picPaths.indexOf(path_) === -1) {
                    yield fs.unlink(path_);
                }
            }
        }
        if (retailerIds) {
            var origRetailerIds = (
                yield knex('retailer_spu').transacting(t).where('spu_id', this.params.id).select('retailer_id')
            ).map(function (i) {
                return i.retailer_id;
            });
            var retailerIdsDeleting = origRetailerIds.filter(function (id) {
                return retailerIds.indexOf(id) === -1;
            });
            yield spu.retailerList().detach(retailerIdsDeleting, { transacting: t });
            yield spu.retailerList().attach(retailerIds, { transacting: t });
        } 
        yield t.commit();
        this.body = spu.toJSON() ;
        this.body.picPaths = yield spu.getPicPaths();
    } catch (e) {
        if (e.message != 'EmptyResponse') {
            throw e;
        }
        this.status = 404;
    }
}).get('/auto-complete/:kw', function *(next) {
    var c = yield models.SPU.where('name', 'like', '%%' + this.params.kw + '%%').fetchAll();
    this.body = {
        results: (c).map(function (item) {
            return {
                title: item.get('name'),
            };
        })
    };
});

exports.app = koa().use(json()).use(router.routes())
.use(router.allowedMethods());
