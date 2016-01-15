var config = require('./config.js');
var defs = require('./defs.js');
var genHash = require('./gen-hash.js');
var co = require('co');
var logger = require('./logger.js');

var setupAdmin = function *(knex) {
    var admin = config.get('admin');
	var hash = yield genHash(admin.password);
	yield  knex.insert({
		email: admin.email,
		password: hash,
		role: defs.roles.Admin,
	}).into('TB_USER');
};

module.exports = setupAdmin;


if (require.main === module) {
    var knex = require('./knex.js');
	co(function *() {
		yield setupAdmin(knex);
	}).then(function () {
        logger.info('\n\n----------------------------------------------');
        logger.info('SETUP ADMIN DONE!');
        logger.info('----------------------------------------------\n\n');
        knex.destroy();
    }, function (err) {
        console.error(err);
        knex.destroy();
    });
}
