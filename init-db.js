
var initDB = function (knex) {
    return knex.schema.createTable('TB_SPU_TYPE', function (table) {
        table.increments();
        table.string('name').unique();
        table.integer('weight');
        table.boolean('enabled');
        table.string('pic_path');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    }).createTable('TB_USER', function (table) {
        table.increments();
        table.string('email').unique();
        table.string('password');
        table.string('role');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

module.exports = initDB;

if (require.main === module) {
    var knex = require('./knex.js');
    initDB(knex).then(function () {
        knex.destroy();
    });
}
