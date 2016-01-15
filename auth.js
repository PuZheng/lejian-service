var koa = require('koa');
var router = require('koa-router')();
var models = require('./models.js');
var config = require('./config.js');
var koaBody = require('koa-body')();
var jwt = require('koa-jwt');
var fs = require('mz/fs');
var logger = require('./logger.js');
var genHash = require('./gen-hash.js');

var privateKey;

var sign = function *(obj) {
	privateKey = privateKey || (yield fs.readFile(config.get('privateKey'))).toString();
	return jwt.sign(obj, privateKey, {
		algorithm: 'RS256'
	});
};

router.post('/login', koaBody, function *(next) {
    try {
        var email = this.request.body.email;
        var password = this.request.body.password;
        var user = (yield models.User.login(email, password)).toJSON();
        delete user.password;
        var token = yield sign(user);
        user.token = token;
        this.body = user;
    } catch (error) {
        this.body = {
            reason: error.message,
        };
        this.status = 403;
    }
	yield next;
}).post('/register', koaBody, function *(next) {
	var email = this.request.body.email;
	var password = yield genHash(this.request.body.password);
	try {
	var user = yield models.User.forge({
		email: email,
		password: password,
	}).save();
	} catch (e) {
		if (e.code === 'SQLITE_CONSTRAINT') {
            e.message = '邮箱已经注册';
            this.status = 403;
            this.body = {
                code: e.code,
                message: e.message,
            };
            return;
		}
	}
	this.body = user.toJSON();
	delete this.body.password;
	this.body.token = yield sign(user);
	yield next;
});

module.exports = {
    app: koa().use(router.routes()).use(router.allowedMethods())
};
