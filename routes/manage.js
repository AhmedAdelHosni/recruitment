var express = require('express'),
    router = express.Router(),
    config = require('../config'),
    oauth2 = require('../modules/oauth2'),
    UserSchema = require('../models/User'),
    FormSchema = require('../models/Form'),
    ObjectID = require('mongodb').ObjectID,
    Refresh = require('passport-oauth2-refresh'),
    GoogleSpreadsheet = require('google-spreadsheet'),
    google = require('googleapis'),
    googleAuth = require('google-auth-library'),
    GDriveHelpers = require('../modules/GDriveHelpers'),
    Helpers = require('../modules/Helpers');


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
    res.render('createormodify.jade', {title: "Create New Form", action: "create"});
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
        companyBannerUrl: body.companyBannerUrl,
        emailImageUrl: body.emailImageUrl,
        bgColor: body.bgColor,
        emailFields: JSON.parse(body.emailFields),
        fields: JSON.parse(body.fields)
    };
    console.log(formObject);
    var form = new FormSchema(formObject);

    UserSchema.findOne({gid: req.user.id}).exec(function(err, user){
        var refreshToken = user.refreshToken
            driveService = google.drive('v3'),
            sheetsService = google.sheets('v4'),
            gmailService = google.gmail('v1'),
            auth = new googleAuth();


        Refresh.requestNewAccessToken('google', refreshToken, function(err, access_token){
            var accessToken = access_token;
            user.accessToken = access_token;
            user.save();
            var oauth2Client = new auth.OAuth2(config.get('OAUTH2_CLIENT_ID'),config.get('OAUTH2_CLIENT_SECRET'),config.get('OAUTH2_CALLBACK'));
            oauth2Client.credentials = {
                access_token: accessToken,
                refresh_token: refreshToken
            };
            google.options({ auth: oauth2Client }); // set auth as a global default

            /////////////////////////////////////////////////////////////
            if(body.hasOwnProperty("id")){//if updating form
                FormSchema.findById(req.body.id).exec(function(err, form){
                    var doc = new GoogleSpreadsheet(form.sheetsId, user.accessToken);
                    var creds = require('../auth.json');
                    doc.useServiceAccountAuth(creds, function(err, response){
                        doc.getCells(1, {"min-row":1,"max-row":1}, function(err, values){
                            if (err) {
                                console.log('The API returned an error: ' + err);
                                return res.send({"success": false, "error": JSON.stringify(err)});
                            }
                            var headerRow = Helpers.extractProperty(values, "_value");
                            var fieldNames = Helpers.extractProperty(formObject.fields, "name");
                            var changed = false;
                            for (var i = 0; i < fieldNames.length; i++)
                                if(formObject.fields[i].type.toLowerCase()!='file' && headerRow.indexOf(fieldNames[i])==-1){
                                    changed = true;
                                    headerRow.push(fieldNames[i]);
                                }

                            if(changed){
                                doc.getInfo(function(err, info){
                                    var sheets = info.worksheets[0];
                                    sheets.setHeaderRow(headerRow , function(err, response){
                                        if(err){
                                            return res.send({"success": false, "error": JSON.stringify(err)});
                                        }
                                        else{
                                            FormSchema.findByIdAndUpdate(body.id, formObject, function(err,formSaved){
                                                if(err){
                                                    return res.send({"success": false, "error": JSON.stringify(err)});
                                                }
                                                res.send({"success": true, "formId": body.id});
                                            });
                                        }//end else no error
                                    });//end setHeaderRow
                                });//end get doc info to get working sheet
                            }//end if header rows changed
                            else {
                                FormSchema.findByIdAndUpdate(body.id, formObject, function(err,formSaved){
                                    if(err){
                                        return res.send({"success": false, "error": JSON.stringify(err)});
                                    }
                                    res.send({"success": true, "formId": body.id});
                                });
                            }//else if header rows didnt change
                        });//end get cells
                    });//end doc.useServiceAccountAuth
                });//end find form
            }//end if updating form

            else {//else if im creating a form
                var initialPromises = [];    
                var createFormFolderPromise = new Promise(function (resolve, reject){
                    console.log('gonna createFormFolderPromise');
                    GDriveHelpers.createFile("Recruitment - "+form.title, "folder", driveService, null, resolve, reject);
                });
                var createSpreadSheetPromise  = new Promise(function (resolve, reject){
                    console.log('gonna createSpreadSheetPromise');
                    var fieldNames = [];
                    for (var i = 0; i < form.fields.length; i++) {
                        if(form.fields[i].type.toLowerCase()!="file"){
                            fieldNames.push(form.fields[i].name);
                        }
                    }
                    var headers = fieldNames.join(",");
                    headers+=",folder link";
                    GDriveHelpers.createFile("Recruitment - "+form.title, "spreadsheet", driveService, null, resolve, reject, headers);
                });
                initialPromises.push(createFormFolderPromise);
                initialPromises.push(createSpreadSheetPromise);

                console.log("now im calling initialPromises");
                Promise.all(initialPromises).then(function (allResponses){
                    console.log("initial promises");
                    console.log(allResponses);
                    console.log("---------");

                    form.folderId = allResponses[0];
                    form.sheetsId = allResponses[1];

                    GDriveHelpers.shareFile(driveService, form.sheetsId, function(err, response){
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
                        });//end create form
                    });//end share spreadsheet
                    
                });//end initialPromises
            }//else if creating form

            
        });//end refreshing token
    });//end finding user
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