var knex = require('./knex.js');
var bookshelf = require('bookshelf')(knex);
var casing = require('casing');
var urljoin = require('url-join');
var config = require('./config.js');
var bcrypt = require('bcrypt');
var path = require('path');
var walk = require('co-walk');
var _ = require('lodash');

var SPUType = bookshelf.Model.extend({
    tableName: 'TB_SPU_TYPE',
    serialize: function () {
        var ret = casing.camelize(bookshelf.Model.prototype.serialize.apply(this));
        ret.pic = {
            path: ret.picPath,
            url: urljoin(config.get('site'), ret.picPath),
        };
        return ret;
    },
    getSpuCnt: function () {
        return SPU.where('spu_type_id', this.get('id')).count();
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

var SPU = bookshelf.Model.extend({
    tableName: 'TB_SPU',
    serialize: function () {
        return casing.camelize(bookshelf.Model.prototype.serialize.apply(this));
    },
    spuType: function () {
        return this.belongsTo(SPUType, 'spu_type_id');
    },
    vendor: function () {
        return this.belongsTo(Vendor, 'vendor_id');
    },
    getPicPaths: function *() {
        var dir = path.join(config.get('assetDir'), 'spu_pics', this.get('id') + '');
        var paths = yield walk(dir);
        var pat = /\.(jpe?g|png)/i;
        return paths.filter(function (path_) {
            return pat.test(path.extname(path_));
        }).map(function (path_) {
            return path.join(dir, path_);
        });
    },
    retailerList: function () {
        return this.belongsToMany(Retailer, 'retailer_spu', 'spu_id', 'retailer_id');
    },
    getRetailerCnt: function *() {
        return (yield knex('retailer_spu').where('spu_id', '=', '' + this.id).count())[0]['count(*)'];
    }
});

var Vendor = bookshelf.Model.extend({
    tableName: 'TB_VENDOR',
    serialize: function () {
        return casing.camelize(bookshelf.Model.prototype.serialize.apply(this));
    },
});

var SKU = bookshelf.Model.extend({
    tableName: 'TB_SKU',
    serialize: function () {
        return casing.camelize(bookshelf.Model.prototype.serialize.apply(this));
    },
    spu: function () {
        return this.belongsTo(SPU, 'spu_id');
    },
});

var Retailer = bookshelf.Model.extend({
    tableName: 'TB_RETAILER',
    serialize: function () {
        var ret = casing.camelize(bookshelf.Model.prototype.serialize.apply(this));
        ret.pic = {
            path: ret.picPath,
            url: urljoin(config.get('site'), ret.picPath),
        };
        return ret;
    },

    spuList: function () {
        return this.belongsToMany(SPU, 'retailer_spu', 'spu_id', 'retailer_id');
    },

    getSPUCnt: function *() {
        return (yield knex('retailer_spu').where('retailer_id', this.id).count())[0]['count(*)'];
    }

});

module.exports = {
    SPUType: SPUType,
    User: User,
    SPU: SPU,
    Vendor: Vendor,
    SKU: SKU,
    Retailer: Retailer,
};
