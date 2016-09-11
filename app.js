
var express = require('express')
var session = require('express-session')
var passport = require('passport');
var path = require('path');
var config = require('./config');
var bodyParser = require('body-parser');
var app = express();
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: config.get('SECRET'),
    signed: true
}));
// app.use(session({
//     secret: config.get('SECRET'),
//     genid: function(req) {
//         return require('crypto').randomBytes(64).toString('hex')
//     },
//     resave: false,
//     saveUninitialized: true
// }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');




// Connect to MongoDB
var mongodb = require('./modules/db');
mongodb.connect('mongodb://cloud11recruitment:1234567890aA@ds011775.mlab.com:11775/recruitment-app', function () {
    console.log('Connected to MongoDB.');
});
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: false }));


//OAuth2
app.use(passport.initialize());
app.use(passport.session());
app.use(require('./modules/oauth2').router);
app.use(require('./routes/notloggedin'));
app.use(require('./routes/all'));


// Basic 404 handler
app.use(function (req, res) {
  res.status(404).send('Not Found');
});


PORT = 8080;
var server = app.listen(PORT, function () {
  var port = server.address().port;

  console.log('Magic happens at ' + port);
});
