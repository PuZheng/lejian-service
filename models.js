var knex = require('./knex.js');
var bookshelf = require('bookshelf')(knex);
var casing = require('casing');
var urljoin = require('url-join');
var config = require('./config.js');
var bcrypt = require('bcrypt');
var path = require('path');

var SPUType = bookshelf.Model.extend({
    tableName: 'TB_SPU_TYPE',
    serialize: function () {
        var ret = casing.camelize(bookshelf.Model.prototype.serialize.apply(this));
        ret.picPath = this.getPicPath();
        ret.pic = {
            path: ret.picPath,
            url: urljoin(config.get('site'), ret.picPath),
        };
        return ret;
    },
    getPicPath: function () {
        return path.join(config.get('assetDir'), 'spu_type_pics', this.get('id') + '.jpg');
    },
    getSpuCnt: function () {
        return new Promise(function (resolve, reject) {
            resolve(10);
        });
    }
});

var User = bookshelf.Model.extend({
    tableName: 'TB_USER',
    role: function () {
        return this.belongsTo(Role, 'role_id');
    },
    serialize: function () {
        var ret = casing.camelize(bookshelf.Model.prototype.serialize.apply(this));
        return ret;
    },
}, {
    login: function (email, password) {
        if (!email || !password) {
            var err = new Error('请输入用户邮箱或者密码');
            err.code = 'MISS_FIELDS';
            throw err;
        }

        return new this({email: email.toLowerCase().trim()}).fetch().tap(function(user) {
            if (!user) {
                throw new Error('错误的邮箱者密码');
            }
            return new Promise(function (resolve, reject) {
                return bcrypt.compare(password, user.get('password'), function (error, same) {
                    if (!same) {
                        reject(new Error('错误的邮箱或者密码'));
                    } else {
                        resolve(user);
                    }
                });
            });
        });
    }
});

module.exports = {
    SPUType: SPUType,
    User: User,
};
