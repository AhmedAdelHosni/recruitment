var express = require('express');
var router = express.Router();
var config = require('../config')
var oauth2 = require('../modules/oauth2')

router.use(oauth2.template);
router.get('/notloggedin', function (req, res, next) {
    console.log("/notloggedin");
    res.render('notloggedin.jade', {"title": "Please Log in"});
});

module.exports = router;