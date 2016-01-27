var config = require('./config.js');
var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var knex = require('./knex.js');
var logger = require('./logger.js');
var models = require('./models.js');
var _ = require('lodash');
var urljoin = require('url-join');
var poiUtils = require('./poi-utils.js');

router.param('spuId', function *(id, next) {
    this.spu = (yield knex('TB_SPU').where({ id: this.params.spuId }).select('id'))[0];
    if (!this.spu) {
        this.body = {
            reason: 'spu does not exists'
        };
        this.status = 403;
        return;
    }
	yield next;
}).post('/:spuId', function *(next) {
	var data = {
        'spu_id': this.params.spuId,
        'user_id': this.state.user.id,
    };
    yield knex('favor').insert(data);
    this.body = data;
    yield next;
}).delete('/:spuId', function *(next) {
    yield knex('favor').where({
        'spu_id': this.params.spuId,
        'user_id': this.state.user.id,
	}).del();
	this.body = {};
	yield next;
}).get('/list', function *(next) {
    var data = yield knex('favor').where('user_id', this.state.user.id).select('*');
    var lnglat = this.query.lnglat && function (p) {
        return {
            lng: p[0],
            lat: p[1]
        };
    }(this.query.lnglat.split(','));

    var nearbySPUs = lnglat && (yield poiUtils.nearbySPUList(lnglat, this.query.distance || config.get('nearbyLimit')));
    var user = this.state.user;

    for (var favor of data) {
        var spu = yield models.SPU.forge('id', favor.spu_id).fetch({ withRelated: [ 'vendor', 'spuType' ] });
        var picPaths = yield spu.getPicPaths();
        var pics = picPaths.map(function (picPath) {
            return {
                path: picPath,
                url: urljoin(config.get('site'), picPath),
            };
        });
        var distance;
        if (nearbySPUs && spu.get('id') in nearbySPUs) {
            distance = nearbySPUs[spu.get('id')].distance;
        }
        favor.spu = _.assign(spu.toJSON(), {
            picPaths: picPaths,
            pics: pics,
            // TODO this is inappropriate
            icon: pics[0],
            retailerCnt: yield spu.getRetailerCnt(),
            distance: distance,
            favored: user && (yield spu.favored(user.id)),
            favorCnt: yield spu.getFavorCnt(),
            commentCnt: yield spu.getCommentCnt(),
        });
    }
    this.body = {
        data: data
    };
    yield next;	
});

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
