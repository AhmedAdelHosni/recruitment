var express = require('express');
var router = express.Router();

var HittupHelper = require('../modules/Helpers');

/* GET users listing. */
router.get('/', function (req, res, next) {
  var sess = req.session
  sess.views++;
  res.send('Hi there'+sess.views);
});

router.get('/signin', function (req, res) {
    Helpers.unjoin(req, function (result) {
        res.send(result);
    });
});

module.exports = router;