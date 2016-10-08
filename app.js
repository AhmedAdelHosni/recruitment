var express = require('express')
var session = require('express-session')
var passport = require('passport');
var path = require('path');
var config = require('./config');
var bodyParser = require('body-parser');
var multer  = require('multer')
var upload = multer();

var app = express();
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: config.get('SESSION_SECRET'),
    signed: true
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');




// Connect to MongoDB
var mongodb = require('./modules/db');
mongodb.connect(config.get("MONGO_URL"), function () {
    console.log('Connected to MongoDB.');
});
app.use(upload.any());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: false }));



//ORDER MATTERS

//OAuth2
app.use(express.static(__dirname + '/statics'));
app.use(passport.initialize());
app.use(passport.session());
app.use(require('./routes/applicant'));
app.use(require('./modules/oauth2').router);
app.use(require('./routes/notloggedin'));
app.use(require('./routes/admin'));
app.use(require('./routes/manage'));
////////////////////////////////////////////

// Basic 404 handler
app.use(function (req, res) {
  res.status(404).send('Not Found');
});


PORT = config.get('PORT');
var server = app.listen(PORT, function () {
  var port = server.address().port;

  console.log('Magic happens at ' + port);
});
