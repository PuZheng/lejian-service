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
var cs = require('co-stream');
var setupAdmin = require('./setup-admin.js');

if (require.main === module) {
    var knex = require('./knex.js');
    co(function *() {
        'use strict';
        yield initDB(knex);
        yield setupAdmin(knex);
        logger.info('CREATING SPU TYPES');
        var dir = path.join(conf.get('assetDir'), 'spu_type_pics');
        if (!(yield fs.exists(dir))) {
            yield mkdirp(dir);
        }
        for (let i = 0; i < 8; ++i) {
            let name = chance.word();
            let id = (yield knex.insert({
                name: name,
                enabled: true,
                weight: chance.integer({ min: 0, max: 5 }),
            }).into('TB_SPU_TYPE'))[0];
            let picPath = path.join(dir, id + '.jpg');
            let ws = fs.createWriteStream(picPath);
            fakeImage(name).pipe(ws);
            yield *cs.wait(ws);
        }
        var spuTypes = yield knex('TB_SPU_TYPE').select('*');
        
        for (let i = 0; i < 16; ++i) {
            let name = chance.word();
            logger.info('CREATING VENDOR ' + name);
            let vendorId = (yield knex.insert({
                name: name,
                desc: chance.paragraph(),
                tel: chance.phone(),
                addr: chance.address(),
                email: chance.email(),
                website: chance.url(),
                weibo_uid: chance.word(),
                weibo_homepage: chance.url(),
                weixin_account: chance.last(),
            }).into('TB_VENDOR'))[0];
            for (let j = 0; j < chance.integer({ min: 1, max: 16 }); ++j) {
                let name = chance.word();
                logger.info('CREATING SPU ' + name);
                yield knex.insert({
                    name: name,
                    code: chance.natural() + '',
                    msrp: chance.floating({ min: 1, max: 1000, fixed: 2 }),
                    vendor_id: vendorId,
                    rating: chance.integer({ min: 1, max: 5 , }),
                    enabled: chance.bool(),
                    desc: chance.paragraph(),
                    spu_type_id: _.sample(spuTypes).id,
                }).into('TB_SPU');
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
