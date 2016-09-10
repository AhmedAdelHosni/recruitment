
var express = require('express')
var session = require('express-session')

var app = express();

app.use(session({
    secret: '2nfQWU$n)z5WdfyWZ',
    genid: function(req) {
        return require('crypto').randomBytes(64).toString('hex')
    },
    resave: false,
    saveUninitialized: true
}));

var all = require('./routes/all');

// Connect to MongoDB
var mongodb = require('./modules/db');
mongodb.connect('mongodb://cloud11recruitment:1234567890aA@ds011775.mlab.com:11775/recruitment-app', function () {
    console.log('Connected to MongoDB.');
});

app.use('/', all);

PORT = 8080;
var server = app.listen(PORT, function () {
  var port = server.address().port;

  console.log('Magic happens at ' + port);
});
