var express = require('express'),
    router = express.Router(),
    config = require('../config'),
    oauth2 = require('../modules/oauth2'),
    UserSchema = require('../models/User'),
    FormSchema = require('../models/Form'),
    ObjectID = require('mongodb').ObjectID;


router.use(oauth2.required);
router.use(oauth2.template);


router.get('/admin', function(req, res) {

    if(config.get("ADMIN_EMAILS").indexOf(req.user.email) == -1) {
        res.send("You are not an admin.");
        return;
    }

    UserSchema.find({}).exec(function(err, users){
        res.render('admin.jade', {
                title: "Cloud 11 - Recruitment App Admin Dashboard",
                users: users
            }   
        );
    });
});

router.get('/admin/delete', function(req,res){

    console.log(req.query.id);
    
    UserSchema.findById(req.query.id).remove().exec();

    res.redirect('/admin');
});

module.exports = router;