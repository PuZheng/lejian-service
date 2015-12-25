var chance = new (require('chance'))();

exports.time = function (minDelta, maxDelta) {
    minDelta = minDelta || -24 * 3600 * 1000;
    maxDelta === undefined && (maxDelta = 24 * 3600 * 1000);
    return new Date(Date.now() + chance.integer({
        min: minDelta,
        max: maxDelta,
    }));
};
