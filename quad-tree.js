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

QuadTree.prototype.nearest = function (lnglat, distance, filter) {
	// TODO this is a naive implementation

	distance = distance || Infinity;

	return _(this.pois).map(function (poi) {
		var distance = mercator.distance(poi, lnglat);
		distance = Math.round(distance) || 1; // 至少是1
		return _.assign(poi, {
			distance: distance,
		});
	}).filter(function (poi) {
		return (poi.distance < distance) &&
			(!filter || filter(poi));
	}).sortBy('distance').value();
};

module.exports = QuadTree;
