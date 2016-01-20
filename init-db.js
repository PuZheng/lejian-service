#! /usr/bin/env node

var initDB = function (knex) {
    return knex.schema.createTable('TB_SPU_TYPE', function (table) {
        table.increments();
        table.string('name').unique().notNullable();
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
    }).createTable('TB_SPU', function (table) {
        table.increments();
        table.string('name').notNullable();
        table.string('code').notNullable();
        table.float('msrp').notNullable();
        table.integer('vendor_id').notNullable().references('TB_VENDOR.id');
        table.integer('spu_type_id').notNullable().references('TB_SPU_TYPE.id');
        table.integer('rating');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.boolean('enabled');
        table.string('desc', 256);
    }).createTable('TB_VENDOR', function (table) {
        table.increments();
        table.string('name').notNullable().unique();
        table.string('desc', 256);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.string('tel', 32);
        table.string('addr', 256);
        table.string('email', 32);
        table.string('website', 32);
        table.string('weibo_user_id', 32);
        table.string('weibo_homepage', 32);
        table.string('weixin_account', 32);
        table.boolean('enabled');
    }).createTable('TB_SKU', function (table) {
        table.increments();
        table.integer('spu_id').notNullable().references('TB_SPU.id');
        table.unique(['spu_id', 'token']);
        table.date('production_date').notNullable();
        table.date('expire_date').notNullable();
        table.string('token').notNullable();
        table.string('checksum').notNullable();
        table.integer('verify_count').defaultTo(0);
        table.timestamp('last_verified_at');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    }).createTable('TB_RETAILER', function (table) {
        table.increments();
        table.string('name').notNullable();
        table.string('desc');
        table.integer('rating');
        table.float('tel');
        table.string('pic_path');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.boolean('enabled');
        table.integer('poi_id').notNullable().references('poi.id');
    }).createTable('retailer_spu', function (table) {
        table.integer('retailer_id').references('TB_RETAILER.id');
        table.integer('spu_id').references('TB_SPU.id');
    }).createTable('poi', function (table) {
        table.increments();
        table.float('lng');
        table.float('lat');
        table.string('addr');
    });
};

module.exports = initDB;

if (require.main === module) {
    var knex = require('./knex.js');
    initDB(knex).then(function () {
        knex.destroy();
    });
}
