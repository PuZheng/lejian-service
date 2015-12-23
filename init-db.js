
var initDB = function (knex) {
    return knex.schema.createTable('TB_SPU_TYPE', function (table) {
        table.increments();
        table.string('name').unique().notNullable();
        table.integer('weight');
        table.boolean('enabled');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    }).createTable('TB_USER', function (table) {
        table.increments();
        table.string('email').unique();
        table.string('password');
        table.string('role');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    }).createTable('TB_SPU', function (table) {
        table.increments();
        table.string('name').notNullable();
        table.string('code').notNullable();
        table.float('msrp').notNullable();
        table.integer('vendor_id').notNullable().references('TB_VENDOR.id');
        table.integer('spu_type_id').notNullable().references('TB_SPU_TYPE.id');
        table.float('rating');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.boolean('enabled');
        table.string('desc', 256);
    }).createTable('TB_VENDOR', function (table) {

        table.increments();
        table.string('name').notNullable();
        table.string('desc', 256);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.string('tel', 32);
        table.string('addr', 256);
        table.string('email', 32);
        table.string('website', 32);
        table.string('weibo_uid', 32);
        table.string('weibo_homepage', 32);
        table.string('weixin_account', 32);
        table.boolean('enabled');
    });
};

module.exports = initDB;

if (require.main === module) {
    var knex = require('./knex.js');
    initDB(knex).then(function () {
        knex.destroy();
    });
}
