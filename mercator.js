var EQUATOR_RADIUS = 6378137.0


var truncateLnglat = function (lng, lat) {
    if (lng > 180.0) {
        lng = 180.0;
	} else if (lng < -180.0) {
		lng = -180.0;
	}
    if (lat > 90.0) {
        lng = 90.0;
	} else if (lat < -90.0) {
        lat = -90.0;
	}
    return [lng, lat];
};

var radians = function(degrees) {
  return degrees * Math.PI / 180;
};

//Returns the Spherical Mercator (x, y) in meters
var xy = function (lng, lat, truncate) {
	if (truncate) {
		var lnglat = truncateLnglat(lng, lat);
		lng = lnglat[0];
		lat = lnglat[1];
	}
    return [
		EQUATOR_RADIUS * radians(lng),
		EQUATOR_RADIUS * Math.log(Math.tan(Math.PI / 4 + radians(lat) / 2))
	];
}

var degrees = function(radians) {
  return radians * 180 / Math.PI;
};

exports.xy = xy;

exports.lnglat = function (x, y) {
    var lng = degrees(x / EQUATOR_RADIUS);
    var lat = degrees(2 * Math.atan(Math.exp(y / EQUATOR_RADIUS)) - Math.PI / 2)
    return [lng, lat];
};

exports.distance = function (p0, p1) {
	var xy0 = xy(p0.lng, p0.lat);
	var xy1 = xy(p1.lng, p1.lat);
	return Math.sqrt(Math.pow(xy0[0] - xy1[0], 2), Math.pow(xy0[1], xy1[1], 2));
};
