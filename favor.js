var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var knex = require('./knex.js');
var logger = require('./logger.js');

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
});

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
