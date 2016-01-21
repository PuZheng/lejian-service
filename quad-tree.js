var _ = require('lodash');
var mercator = require('./mercator.js');

function QuadTree(pois) {
	this.pois = pois.map(function (poi) {
		return {
			lng: poi.lng,
			lat: poi.lat,
			bundle: poi.bundle,
		};
	});
};

QuadTree.prototype.nearest = function (lnglat, distance) {
	// TODO this is a naive implementation
	distance = distance || Infinity;

	return _(this.pois).map(function (poi) {
		return _.assign(poi, {
			distance: mercator.distance(poi, lnglat)
		});
	}).filter(function (poi) {
		return poi.distance < distance;
	}).sortBy('distance').value();
};

module.exports = QuadTree;
