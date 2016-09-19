var express = require('express')
var session = require('express-session')
var passport = require('passport');
var path = require('path');
var config = require('./config');
var bodyParser = require('body-parser');
var multer  = require('multer')
var upload = multer({dest: './uploads/'});

var app = express();
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: config.get('SECRET'),
    signed: true
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');




// Connect to MongoDB
var mongodb = require('./modules/db');
mongodb.connect('mongodb://cloud11recruitment:1234567890aA@ds011775.mlab.com:11775/recruitment-app', function () {
    console.log('Connected to MongoDB.');
});
app.use(upload.any());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: false }));


//OAuth2
app.use(express.static(__dirname + '/statics'));
app.use(passport.initialize());
app.use(passport.session());
app.use(require('./routes/applicant'));//ORDER MATTERS
app.use(require('./modules/oauth2').router);
app.use(require('./routes/notloggedin'));
app.use(require('./routes/manage'));


// Basic 404 handler
app.use(function (req, res) {
  res.status(404).send('Not Found');
});


PORT = config.get('PORT');
var server = app.listen(PORT, function () {
  var port = server.address().port;

  console.log('Magic happens at ' + port);
});
