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
var cofy = require('cofy');
var tmp = require('tmp');
var poiUtils = require('./poi-utils.js');

var jsonizeRetailer = function *(retailer) {
	return _.assign(retailer.toJSON(), {
		spuCnt: yield retailer.getSPUCnt()
	});
};

router.get('/list', function *(next) {
    var model = models.Retailer;
    var query = casing.camelize(this.query);
	query.sortBy = query.sortBy || 'created_at.desc';

	if (query.sortBy === 'distance.desc') {
		this.status = 403;
		this.body = {
			reason: 'retailers can\'t be sorted by distance descentally'
		};
		yield next;
		return;
	}

	if (query.sortBy === 'distance.asc') {
		var lnglat = function (lnglat) {
			return {
				lng: parseFloat(lnglat[0]),
				lat: parseFloat(lnglat[1])
			}
		}(query.lnglat.split(','));
		var filter = query.spuId && function (spuId) {
			return function (poi) {
				return poi.bundle.spuList.some(function (spu) {
					return spu.id == spuId;
				})
			};
		}(query.spuId);
		var nearbyPOIList = yield poiUtils.nearbyPOIList(lnglat, query.distance || config.get('nearbyLimit'), filter);
		this.body = {
			data: nearbyPOIList.map(function (poi) {
				return _.assign(poi.bundle, {
					distance: poi.distance,
				});
			})
		};
	} else {
		model = model.query(function (q) {
			query.rating && q.where('rating', query.rating);
			query.enabledOnly === '1' && q.where('enabled', true);
			query.kw && q.where('name', 'like', '%%' + query.kw + '%%');
			query.spuId && q.join('retailer_spu', 'retailer_spu.retailer_id', 'TB_RETAILER.id').where('retailer_spu.spu_id', query.spuId);
		});

		var totalCnt = yield model.clone().count();

		model = model.query(function (q) {
			q.orderBy.apply(q, query.sortBy.split('.'));
			if (query.perPage && query.page) {
				var perPage = parseInt(query.perPage);
				var page = parseInt(query.page);
				q.offset((page - 1) * perPage).limit(perPage);
			}
		});

		var c = (yield model.fetchAll({ withRelated: [ 'poi' ] }));
		var data = yield (c.map(function (retailer) {
			return jsonizeRetailer(retailer);
		}));

		this.body = {
			totalCnt: totalCnt,
			data: data,
		};
	}

    yield next;
}).post('/object', koaBody, function *(next) {
    var picPath = this.request.body.picPath;

    if (picPath) {
		var targetPath = yield cofy.fn(tmp.tmpName)({
			template: path.join(config.get('assetDir'), 'retailer_pics', '/XXXXXX' + path.extname(picPath)),
		});
        yield fs.rename(picPath, targetPath);
		this.request.body.picPath = targetPath;
    }

	var lnglat = this.request.body.lnglat;
	if (lnglat) {
		this.request.body.lng = this.request.body.lnglat[0];
		this.request.body.lat = this.request.body.lnglat[1];
	}
	delete this.request.body.lnglat;

    var item = yield models.Retailer.forge(casing.snakeize(this.request.body)).save();
	this.body = yield jsonizeRetailer(item);
	yield next;
}).get('/auto-complete/:kw', function *(next) {
    var c = yield models.Retailer.where('name', 'like', '%%' + this.params.kw + '%%').fetchAll();
    this.body = {
        results: (c).map(function (item) {
            return {
                title: item.get('name'),
            };
        })
    };
	yield next;
}).param('id', function *(id, next) {
	this.item = yield models.Retailer.forge({ id: this.params.id }).fetch();
	if (!this.item) {
		return (this.status = 404);
	}
	yield next;
}).get('/object/:id', function *(next) {
	this.body = yield jsonizeRetailer(this.item);
	yield next;
}).put('/object/:id', koaBody, function *(next) {
	var body = this.request.body;
	if (body.lnglat) {
		body.lng = body.lnglat[0];
		body.lat = body.lnglat[1];
	}
	delete body.lnglat;
	if (body.picPath) {
		var newPath = yield cofy.fn(tmp.tmpName)({
			template: path.join(config.get('assetDir'), 'retailer_pics', '/XXXXXX' + path.extname(body.picPath)),
		});
        yield fs.rename(body.picPath, newPath);
		body.picPath = newPath;
	}
	this.item = yield this.item.save(casing.snakeize(body));
	this.body = yield jsonizeRetailer(this.item);
	yield next;
});

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
