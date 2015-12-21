var bcrypt = require('bcrypt');
var config = require('./config.js');
var defs = require('./defs.js');

var genHash = function (username) {
    return new Promise(function (resolve, reject) {
        bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(username, salt, function(err, hash) {
                resolve(hash);
            });
        });
    });
};

var setupAdmin = function (knex) {
    var admin = config.get('admin');
    return genHash(admin.password).then(function (hash) {
        return  knex.insert({
            email: admin.email,
            password: hash,
            role: defs.roles.Admin,
        }).into('TB_USER');
    });
};

module.exports = setupAdmin;


if (require.main === module) {
    var knex = require('./knex.js');
    setupAdmin(knex).then(function () {
        logger.info('\n\n----------------------------------------------');
        logger.info('SETUP ADMIN DONE!');
        logger.info('----------------------------------------------\n\n');
        knex.destroy();
    }, function (err) {
        console.error(err);
        knex.destroy();
    });
}
