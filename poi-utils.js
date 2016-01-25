var _ = require('lodash');
var casing = require('casing');
var knex = require('./knex.js');
var QuadTree = require('./quad-tree.js');
var logger = require('./logger.js');

var makeQuadTree = function () {
	var quadTree;
	return function * () {
		if (!quadTree) {
			var retailers = casing.camelize(yield knex('TB_RETAILER').join('poi', 'TB_RETAILER.poi_id', 'poi.id').select('TB_RETAILER.*', 'poi.lng', 'poi.lat'));
			retailers = yield retailers.map(function (retailer) {
				return function *() {
					var spuList = casing.camelize(yield knex('TB_SPU').join('retailer_spu', 'TB_SPU.id', 'retailer_spu.spu_id').join('TB_RETAILER', 'TB_RETAILER.id', 'retailer_spu.retailer_id').where('TB_RETAILER.id', retailer.id).select('TB_SPU.*'));
					return _.assign(retailer, {
						spuList: spuList,
					});
				}
			});
			quadTree = new QuadTree(retailers.map(function (retailer) {
				return _.assign({
					lng: retailer.lng,
					lat: retailer.lat
				}, {
					bundle: retailer,
				});
			}));
			logger.info(`quadtree build ${retailers.length} with pois`);
		}
		return quadTree;
	};
}();

var nearbyPOIList = function * (p, distance) {
	return (yield makeQuadTree()).nearest(p, distance);
};

var nearbySPUList = function * (p, distance) {
	var nearbyPOIs = yield nearbyPOIList(p, distance);
	var ret = new Map();
	if (!_.isEmpty(nearbyPOIs)) {
		nearbyPOIs.forEach(function (poi) {
			for (var spu of poi.bundle.spuList)	{
				if (!(spu.id in ret)) {
					ret[spu.id] = _.assign({}, spu, { distance: poi.distance });
				}
			}
		});
	}
	return ret;
};

module.exports = {
	nearbySPUList: nearbySPUList,
	nearbyPOIList: nearbyPOIList,
};
