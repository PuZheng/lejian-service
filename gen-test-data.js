"strict mode";

var initDB = require('./init-db.js');
var co = require('co');
var logger = require('./logger.js');
var _ = require('lodash');
var chance = new (require('chance'))();
var utils = require('./utils.js');
var fs = require('mz/fs');
var mkdirp = require('co-mkdirp');
var path = require('path');
var conf = require('./config.js');
var fakeImage = require('./fake-image.js');
var fakeTime = require('./fake-time.js');
var cs = require('co-stream');
var setupAdmin = require('./setup-admin.js');
var cofy = require('cofy');
var tmp = require('tmp');
var argv = require('yargs').argv;
var fakeLnglat = require('./fake-lnglat.js');
var shelljs = require('shelljs');
var defs = require('./defs.js');
var genHash = require('./gen-hash.js');
var moment = require('moment');

var genSPUType = function *(dir) {
    var name = chance.word();
    var picPath = yield cofy.fn(tmp.tmpName)({
        dir: dir,
        prefix: '',
        postfix: '.jpg'
    });
    var ws = fs.createWriteStream(picPath);
    fakeImage(name).pipe(ws);
    yield cs.wait(ws);
    var id = (yield knex.insert({
        name: name,
        enabled: true,
        weight: chance.integer({ min: 0, max: 5 }),
        pic_path: picPath,
    }).into('TB_SPU_TYPE'))[0];
    return id;
};

function *genVendor() {
    var name = chance.word();
    logger.info('CREATING VENDOR ' + name);
    var vendorId = (yield knex.insert({
        name: name,
        desc: chance.paragraph(),
        tel: chance.phone(),
        addr: chance.address(),
        email: chance.email(),
        website: chance.url(),
        weibo_user_id: chance.word(),
        weibo_homepage: chance.url(),
        weixin_account: chance.last(),
        enabled: chance.bool(),
    }).into('TB_VENDOR'))[0];
    return vendorId;
}

function *genRetailer(dir) {
    var name = chance.word();
    logger.info('CREATING RETAILER ' + name);
    var lnglat = fakeLnglat();
    var poiId = (yield knex('poi').insert({
        lng: lnglat.lng,
        lat: lnglat.lat,
        addr: chance.address(),
    }))[0];
    var picPath = yield cofy.fn(tmp.tmpName)({
        dir: dir,
        prefix: '',
        postfix: '.jpg'
    });
    var ws = fs.createWriteStream(picPath);
    fakeImage(name).pipe(ws);
    yield cs.wait(ws);
    var id = (yield knex('TB_RETAILER').insert({
        name: name,
        desc: chance.paragraph(),
        tel: chance.phone(),
        enabled: chance.bool(),
        rating: chance.integer({ min: 1, max: 5 }),
        pic_path: picPath,
        poi_id: poiId,
    }))[0];
    return id;
}

function *genSPU(vendorId, spuTypes) {
    var name = chance.word();
    logger.info('CREATING SPU ' + name);
    var msInWeek = 7 * 24 * 3600 * 1000;
    var spuId = (yield knex.insert({
        name: name,
        code: chance.natural() + '',
        msrp: chance.floating({ min: 1, max: 1000, fixed: 2 }),
        vendor_id: vendorId,
        rating: chance.integer({ min: 1, max: 5 }),
        enabled: chance.bool(),
        desc: chance.paragraph(),
        spu_type_id: _.sample(spuTypes).id,
        created_at: moment(fakeTime.time(-msInWeek, 0)).format('YYYY-MM-DD HH:mm:ss'),
    }).into('TB_SPU'))[0];
    var dir = path.join(conf.get('assetDir'), 'spu_pics', '' + spuId);
    shelljs.exec('rm -rf ' + dir);
    yield utils.assertDir(dir);
    for (var k = 0; k < chance.integer({ min: 1, max: 4 }); ++k) {
        var picPath = yield cofy.fn(tmp.tmpName)({ dir: dir, postfix: '.jpg', prefix: '' });
        var ws = fs.createWriteStream(picPath);
        fakeImage(name).pipe(ws);
        yield cs.wait(ws);
    }
    return spuId;
}

function *genUsers() {
	for (var i = 0; i < (argv.q? 4: 64); ++i) {
		var s = 'test' + i;
		yield knex('TB_USER').insert({
			email: s + '@lejian.com',
			password: yield genHash(s),
			role: defs.roles.User,
		});
	}
}

function fakeSKUData(spuId) {
    var msInWeek = 7 * 24 * 3600 * 1000;
    return function () {
        var productionDate = chance.date({ year: new Date().getFullYear() - chance.integer({ min: 0, max: 3 }) });
        var expireDate = new Date(productionDate);
        expireDate.setDate(expireDate.getDate() + chance.integer({ min: 180, max: 2 * 365 }));
        return {
            spu_id: spuId,
            production_date: productionDate,
            expire_date: expireDate,
            token: chance.string({ length: 24 }),
            checksum: chance.string(),
            verify_count: chance.integer({ min: 0 }),
            last_verified_at: moment(fakeTime.time(-msInWeek, 0)).format('YYYY-MM-DD HH:mm:ss'),
        };
    };
}

if (require.main === module) {
    var knex = require('./knex.js');
    co(function *() {
		"use strict";
        yield initDB(knex);
        yield setupAdmin(knex);
		yield genUsers();
        let dir = path.join(conf.get('assetDir'), 'spu_type_pics');
        shelljs.exec('rm -rf ' + dir);
        if (!(yield fs.exists(dir))) {
            yield mkdirp(dir);
        }

        for (let i = 0; i < 8; ++i) {
            yield genSPUType(dir);
        }
        var spuTypes = yield knex('TB_SPU_TYPE').select('*');

        dir = path.join(conf.get('assetDir'), 'retailer_pics');
        shelljs.exec('rm -rf ' + dir);
        if (!(yield fs.exists(dir))) {
            yield mkdirp(dir);
        }
        for (let i=0; i < (argv.q? 16: 3000); ++i) {
            yield genRetailer(dir);
        }
        var retailers = yield knex('TB_RETAILER').select('*');

		var users = yield knex('TB_USER').select('*');
        for (let i = 0; i < (argv.q? 16: 256); ++i) {
            let vendorId = yield genVendor();
            for (let j = 0; j < chance.integer({ min: 1, max: argv.q? 8: 96 }); ++j) {
                let spuId = yield genSPU(vendorId, spuTypes);
                yield knex('retailer_spu').insert(_.sample(retailers, chance.integer({ min: 1, max: 50 })).map(
                    function (retailer) {
                        return {
                            spu_id: spuId,
                            retailer_id: retailer.id
                        };
                    }));
                for (let m = 0; m < (argv.q? 1: chance.integer({ min: 10, max: 20 })); ++m) {
                    var skuData = _.times(chance.integer({ min: 50, max: 100 }), fakeSKUData(spuId));
                    yield knex.insert(skuData).into('TB_SKU');
                }
                yield knex('comment').insert(_.times(chance.integer({ min: 1, max: 10 }), function () {
                    return {
                        spu_id: spuId,
                        user_id: _.sample(users).id,
                        created_at: moment(chance.date({ year: new Date().getFullYear() - chance.integer({ min: 0, max: 3 }) })).format('YYYY-MM-DD HH:mm:ss'),
                        content: chance.paragraph(),
                        rating: chance.integer({ min: 1, max: 5 }),
                    }
                }));
            }
        }
    }).then(function () {
        knex.destroy();
        logger.info('\n\n----------------------------------------------');
        logger.info('MAKE TEST DATA DONE!');
        logger.info('----------------------------------------------\n\n');
    }, function (err) {
        logger.error(err);
        knex.destroy();
    });
}
