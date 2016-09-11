var express = require('express');
var router = express.Router();
var config = require('../config');
var oauth2 = require('../modules/oauth2');
var UserSchema = require('../models/User');
var FormSchema = require('../models/Form');
var crypto = require('crypto');
var ObjectID = require('mongodb').ObjectID;


router.use(oauth2.required);
router.use(oauth2.template);
/* GET users listing. */
router.get('/', function (req, res, next) {
    var query = UserSchema.findOne({gid: req.user.id});
    query.populate({
        path: 'forms',
        select: 'formId name'
    });
    query.exec(function (err, user) {
        console.log(user.forms);
        res.render('home.jade', {
                title: "Cloud 11 - Recruitment App",
                forms: user.forms
            });
    });
    
});

router.get('/create', function (req, res) {
    res.render('create.jade', {title: "Create New Form"})
});

router.get('/edit', function (req, res) {
    // res.render('create.jade')
});

router.post('/submitform', function (req, res) {
    var body = req.body;
    var formId = crypto.randomBytes(14).toString('hex');
    var myForm = new FormSchema({ name: body.name, formId: formId});
    myForm.save();
    UserSchema.findOneAndUpdate({gid: req.user.id}, 
        {
            $push: {
                // "forms": {
                //     formId: formId,
                //     name: body.name
                // }
                "forms": myForm
            }
        },
        function (err, updatedUser) {
            if(err){
                return res.send({"success": false, "error": err.message});
            }
            res.send({"success": true, "formId": formId});
        }
    );//end findByIdAndUpdate

});

router.post('/getform', function (req, res) {
    //for editform page ajax to get the form data using an id
});


module.exports = router;