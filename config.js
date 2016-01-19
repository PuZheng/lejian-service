var convict = require('convict');

var conf = convict({
    env: {
        doc: "The applicaton environment.",
        format: ["production", "development", "test"],
        default: "development",
        env: "NODE_ENV"
    },
    port: {
        doc: 'listening port',
        format: 'port',
        default: 5000,
        env: 'PORT'
    },
    knexOpts: {
        doc: "options for knex",
        format: function () {

        },
        default: {
            client: 'sqlite3',
            connection: {
                filename: './db',
            },
            debug: true
        },
        env: "KNEX_OPTS",
    },
    admin: {
        doc: 'system admin account information',
        format: function () {

        },
        default: {
            email: 'admin@lejian.com',
            password: 'admin'
        }
    },
    assetDir: {
        doc: 'where assets resides',
        format: String,
        default: 'assets',
        env: 'ASSET_DIR',
    },
    site: {
        doc: 'this website',
        format: 'url',
        default: 'http://127.0.0.1:5000',
        env: 'WEB_SITE'
    },
    privateKey: {
        doc: 'private key',
        format: String,
        default: "private.pem",
    },
    publicKey: {
        doc: 'public key',
        format: String,
        default: "public.pem",
    },
    jwtEnabled: {
        doc: 'is jwt enabled?',
        format: Boolean,
        default: true,
        env: 'JWT_ENABLED'
    }
});

// Load environment dependent configuration
var env = conf.get('env');
env != 'development' && conf.loadFile('./config/' + env + '.json');

// Perform validation
conf.validate({strict: true});

module.exports = conf;
