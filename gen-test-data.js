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
        logger.info('creating spu types');
        var dir = path.join(conf.get('assetDir'), 'spu_type_pics');
        if (!(yield fs.exists(dir))) {
            yield mkdirp(dir);
        }
        for (var i = 0; i < 8; ++i) {
            var name = chance.word();
            var id = (yield knex.insert({
                name: name,
                enabled: true,
                weight: chance.integer({ min: 0, max: 5 }),
            }).into('TB_SPU_TYPE'));
            var picPath = path.join(dir, id + '.jpg');
            var ws = fs.createWriteStream(picPath);
            fakeImage(name).pipe(ws);
            yield *cs.wait(ws);
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
