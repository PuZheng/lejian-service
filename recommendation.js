var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');
var casing = require('casing');
var urljoin = require('url-join');
var config = require('./config.js');
var _ = require('lodash');
var knex = require('./knex.js');
var logger = require('./logger.js');

var poiUtils = require('./poi-utils.js');

router.get('/:id', function *(next) {
	var query = casing.camelize(this.query);
	var spu = yield models.SPU.forge({ id: this.params.id }).fetch();
	if (!spu) {
		this.status = 404;
		yield next;
		return;
	}
	var cond = {
		'SAME_TYPE': { 'spu_type_id': spu.get('spu_type_id') },
		'SAME_VENDOR': { 'vendor_id': spu.get('vendor_id') },
	}[query.type.toUpperCase()];

	if (!cond) {
		this.status = 403;
		this.body = {
			reason: "invalid recommendation type",
		};
		yield next;
		return;
	}
	// TODO this is very naive
	var spuIds = _.sample(yield knex('TB_SPU').where(cond).select('id'), query.count || 6).map(function (id) {
		return id.id;
	});
	var c = yield models.SPU.where('id', 'in', spuIds).fetchAll({ withRelated: [ 'spuType', 'vendor' ] });
	var lnglat = query.lnglat && function (p) {
		return {
			lng: p[0],
			lat: p[1]
		};
	}(query.lnglat.split(','));
	var nearbySPUs = lnglat && (yield poiUtils.nearbySPUList(lnglat, query.distance || config.get('nearbyLimit')));
	var	data = yield c.map(function (item) {
		return function *() {
			var picPaths = yield item.getPicPaths();
			var pics = picPaths.map(function (picPath) {
				return {
					path: picPath,
					url: urljoin(config.get('site'), picPath),
				};
			});
			var distance;
			if (nearbySPUs && item.get('id') in nearbySPUs) {
				distance = nearbySPUs[item.get('id')].distance;
			}
			return _.assign(item.toJSON(), {
				picPaths: picPaths,
				pics: pics,
				// TODO this is inappropriate
				icon: pics[0],
				retailerCnt: yield item.getRetailerCnt(),
				distance: distance,
			});
		};
	});
	this.body = {
		data: data,
	};
	yield next;
})

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
