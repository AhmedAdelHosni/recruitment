var express = require('express');
var router = express.Router();
var config = require('../config');
var oauth2 = require('../modules/oauth2');
var UserSchema = require('../models/User');
var FormSchema = require('../models/Form');
var ObjectID = require('mongodb').ObjectID;


router.use(oauth2.required);
router.use(oauth2.template);
/* GET users listing. */
router.get('/', function(req, res, next) {
    var query = UserSchema.findOne({gid: req.user.id});
    query.populate({
        path: 'forms',
        select: 'formId title fields'
    });
    query.exec(function(err, user) {
        res.render('home.jade', {
                title: "Cloud 11 - Recruitment App",
                forms: user.forms
            });
    });
    
});

router.get('/create', function(req, res) {
    res.render('createormodify.jade', {title: "jCreate New Form", action: "create"});
});

router.get('/edit', function(req, res) {
    res.render('createormodify.jade', {title: "Edit form", action: "edit", id: req.query.id});
});

router.post('/submitform', function(req, res) {
    var body = req.body;
    var formObject = {
        title: body.title,
        companyName: body.companyName,
        description: body.description,
        companyUrl: body.companyUrl,
        recruiterEmail: body.recruiterEmail,
        fields: JSON.parse(body.fields)
    };
    var form = new FormSchema(formObject);

    if(body.hasOwnProperty("id")){
        FormSchema.findByIdAndUpdate(body.id, formObject, function(err,formSaved){
            if(err){
                return res.send({"success": false, "error": JSON.stringify(err)});
            }
            res.send({"success": true, "formId": body.id});
        });
    }
    else {
        form.save(function(err,formSaved){
            if(err){
                return res.send({"success": false, "error": JSON.stringify(err)});
            }        
            UserSchema.findOneAndUpdate({gid: req.user.id}, 
            { $push: {"forms": form} },
            function(err, updatedUser) {
                if(err){
                    return res.send({"success": false, "error": JSON.stringify(err)});
                }
                res.send({"success": true, "formId": form._id.toString()});
            });//end findOneAndUpdate
        });
    }
    

});
router.post('/getform', function(req, res) {
    var query = FormSchema.findById(req.body.id);
    query.exec(function(err, form) {
        if(err){
            res.send({"success": false, "error": JSON.stringify(err)});
        }
        res.send({"success": true, "form": form});
    });

});

router.get('/delete', function(req, res) {
    FormSchema.findById(req.query.id).remove(function(err, deletedForm){
        res.render("removed.jade", {"title": "Form Removed"});
    });
});


module.exports = router;