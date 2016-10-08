var nconf = module.exports = require('nconf');
var path = require('path');

nconf
    .file(path.join(__dirname, 'config.json'))
    .defaults({
        PORT: 8080,

    });