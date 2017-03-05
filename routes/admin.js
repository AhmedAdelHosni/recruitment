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

    if(config.get("ADMIN_EMAILS").indexOf(req.user.email) == -1) {
        res.send("You are not an admin.");
        return;
    }

    UserSchema.findById(req.query.id).remove().exec();

    res.redirect('/admin');
});

router.get('/admin/editMaxForms', function(req,res){

    if(config.get("ADMIN_EMAILS").indexOf(req.user.email) == -1) {
        res.send("You are not an admin.");
        return;
    }

    UserSchema.findOneAndUpdate({_id: req.query.id}, {maxNumOfForms: req.query.max}, function(err, updatedUser) {
        console.log(updatedUser);
        
    });
    res.redirect('/admin');
});


router.get('/admin/editMaxApplicants', function(req,res){

    if(config.get("ADMIN_EMAILS").indexOf(req.user.email) == -1) {
        res.send("You are not an admin.");
        return;
    }

    UserSchema.findOneAndUpdate({_id: req.query.id}, {maxNumOfApplicantsPerForm: req.query.max}, function(err, updatedUser) {
        console.log(updatedUser);
    });
    res.redirect('/admin');
});

router.get('/admin/editForms',function(req,res){

    if(config.get("ADMIN_EMAILS").indexOf(req.user.email) == -1) {
        res.send("You are not an admin.");
        return;
    }

    var query = UserSchema.findOne({_id: req.query.id});
    query.populate({
        path: 'forms',
        select: 'formId title'
    });

    query.exec(function(err, user) {
        console.log(user);
        res.render('home.jade', {
                title: "Cloud 11 - Recruitment App",
                forms: user.forms,
                isAdmin: 1,
                myforms: false
            }
        );
    });
});

module.exports = router;