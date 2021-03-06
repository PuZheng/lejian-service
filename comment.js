var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');
var logger = require('./logger.js');
var koaBody = require('koa-body')();

router.post('/object', koaBody, function *(next) {
    var comment = yield models.Comment.forge({
        spu_id: this.request.body.spuId,
        user_id: this.state.user.id,
		content: this.request.body.content,
		rating: this.request.body.rating,
    }).save();
	// this may seem silly, but must fetch again to get "created_at"
    this.body = (yield models.Comment.forge('id', comment.get('id')).fetch({ withRelated: [ 'user' ] })).toJSON();
    yield next;
}).get('/list', function *(next) {
	this.body = {
		data: (yield models.Comment.query(function (q) {
			q.orderBy('created_at', 'desc');
		}).where('spu_id', this.query.spu_id).fetchAll({ withRelated: ['user'] }))
	};
	yield next;
});

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
