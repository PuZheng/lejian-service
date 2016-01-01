var chance = new (require('chance'))();
var _ = require('lodash');

var bounds = [
    // a block of area in HangZhou
    {
        weight: 1,
        ne: {
            lng: 120.279919,
            lat: 30.300651
        },
        sw: {
            lng: 120.079762,
            lat: 30.196848,
        }
    },
    // a block of area in BeiJing
    {
        weight: 1,
        ne: {
            lng: 116.496674,
            lat: 39.955216,
        },
        sw: {
            lng: 116.296517,
            lat: 39.863043,
        }
    },
    // a huge area in china
    {
        weight: 98,
        ne: {
            'lng': 116.015625,
            'lat': 39.774769
        },
        sw: {
            lng: 100.019531,
            lat: 23.563987
        }
    }
];

var totalWeight = _.sum(bounds.map(function (b) {
    return b.weight;
}));

module.exports = function () {
    var weight = chance.integer({ 
        min: 0, 
        max: totalWeight
    });
    var acc = 0;
    for (var bound of bounds) {
        if (weight < bound.weight + acc) {
            break;
        }
        acc += bound.weight;
    }
    return {
        lng: chance.floating({
            min: bound.sw.lng,
            max: bound.ne.lng,
        }),
        lat: chance.floating({
            min: bound.sw.lat,
            max: bound.ne.lat
        })
    };
};
