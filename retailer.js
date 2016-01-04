var koa = require('koa');
var router = require('koa-router')();
var json = require('koa-json');
var models = require('./models.js');
var logger = require('./logger.js');
var casing = require('casing');
var _ = require('lodash');
var koaBody = require('koa-body')();
var path = require('path');
var fs = require('mz/fs');
var config = require('./config.js');
var urljoin = require('url-join');
var cofy = require('cofy');
var tmp = require('tmp');

var _jsonify = function *(retailer) {
	return _.assign(retailer.toJSON(), {
		spuCnt: yield retailer.getSPUCnt()
	});
};

router.get('/list', function *(next) {
    var model = models.Retailer;
    query = casing.camelize(this.query);

    model = model.query(function (q) {
        query.enabledOnly === '1' && q.where('enabled', true);
        query.kw && q.where('name', 'like', '%%' + query.kw + '%%');
    });

    var totalCnt = yield model.clone().count();

    model = model.query(function (q) {
        q.orderBy.apply(q, (query.sortBy || 'created_at.desc').split('.'));
        if (query.perPage && query.page) {
            var perPage = parseInt(query.perPage);
            var page = parseInt(query.page);
            q.offset((page - 1) * perPage).limit(perPage);
        }
    });

    var c = (yield model.fetchAll());
    var data = yield (c.map(function (retailer) {
        return _jsonify(retailer);
    }));

    this.body = {
        totalCnt: totalCnt,
        data: data,
    };
    yield next;
}).post('/object', koaBody, function *(next) {
    this.request.body;
    var picPath = this.request.body.picPath;

    if (picPath) {
		var targetPath = cofy.fn(tmp.tmpName)({
			dir: path.join(config.get('assetDir'), 'retailer_pics'),
			prefix: '',
			postfix: path.extname(picPath),
		});
        yield fs.rename(picPath, targetPath);
		this.request.body.picPath = targetPath;
    }

    var item = yield models.Retailer.forge(casing.snakeize(this.request.body)).save();
	this.body = yield _jsonify(item);
	yield next;
});

exports.app = koa().use(json()).use(router.routes()).use(router.allowedMethods());
