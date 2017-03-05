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
        select: 'formId title fields numOfApplicants'
    });
    query.exec(function(err, user) {
        res.render('home.jade', {
                title: "Cloud 11 - Recruitment App",
                forms: user.forms,
                isAdmin: config.get("ADMIN_EMAILS").indexOf(req.user.email) != -1
            }
        );
    });
    
});

router.get('/create', function(req, res) {
    console.log(req.user.id);
    UserSchema.findOne({"gid":req.user.id},function(err,user){
        console.log("NOW CREATING NEW FORM");
        var max;
        if(user.maxNumOfForms == null){
            res.render('LimitsReached.jade', {
                title: "User Undefined",
                msg: "You are not approved yet, please contact admin at " + config.get("ADMIN_EMAILS")[0] + "."
            });
        }
        else{
            max = user.maxNumOfForms;
            if(user.forms.length == max){
                res.render('LimitsReached.jade',{
                    title: "Form Limit Reached",
                    msg: "Maximum number of forms has been reached, please contact admin at " + config.get("ADMIN_EMAILS")[0] + "."
                });
            }
            else{
                res.render('createormodify.jade', {
                    title: "Create New Form",
                    action: "create",
                    isAdmin: config.get("ADMIN_EMAILS").indexOf(req.user.email) != -1
                });
            }
        }
    });
});

router.get('/edit', function(req, res) {
    res.render('createormodify.jade', {
                title: "Edit form",
                action: "edit",
                id: req.query.id,
                isAdmin: config.get("ADMIN_EMAILS").indexOf(req.user.email) != -1
        });
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
                if(user.forms.indexOf(req.body.id) == -1 && config.get("ADMIN_EMAILS").indexOf(req.user.email) == -1) {
                    res.send({"success": false, "error": "Your account does not include this form"});
                    return;
                }

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
                    GDriveHelpers.createFile(form.title, "folder", driveService, [user.folderId], resolve, reject);
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
                    GDriveHelpers.createFile(form.title, "spreadsheet", driveService, [user.folderId], resolve, reject, headers);
                });
                initialPromises.push(createFormFolderPromise);
                initialPromises.push(createSpreadSheetPromise);

                console.log("calling initialPromises");
                Promise.all(initialPromises).then(function (allResponses){
                    console.log("initial promises");
                    console.log(allResponses);
                    console.log("---------");

                    form.folderId = allResponses[0];
                    form.sheetsId = allResponses[1];
                    console.log("I'm just before GDriveHelpers");
                    GDriveHelpers.shareFile(driveService, form.sheetsId, function(err, response){
                        console.log("I'm in GDriveHelpers shareFile");
                        console.log(response);
                        if (err) {
                            return res.send({"success": false, "error": JSON.stringify(err)});
                        }
                        
                        form.save(function(err, formSaved){
                            console.log("I'm in formSaved");
                            console.log(formSaved);
                            if (err) {
                                return res.send({"success": false, "error": JSON.stringify(err)});
                            }        
                            UserSchema.findOneAndUpdate({gid: req.user.id}, { $push: {"forms": form} }, function(err, updatedUser) {
                                console.log("I'm in findOneAndUpdate");
                                console.log(updatedUser);
                                if (err) {
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
    var userId = req.user.id;
    var formId = req.body.id;
    UserSchema.findOne({gid: userId}).exec(function (err, user) {

        if(user.forms.indexOf(formId) == -1 && config.get("ADMIN_EMAILS").indexOf(req.user.email) == -1) {
            res.send({"success": false, "error": "Your account does not include this form"});
            return;
        }

        FormSchema.findById(formId).exec(function(err, form) {
            if(err){
                res.send({"success": false, "error": JSON.stringify(err)});
            }
            res.send({"success": true, "form": form});
        });
    });
});

router.get('/delete', function(req, res) {
    var userId = req.user.id;
    var formId = req.query.id;
    UserSchema.findOne({gid: userId}).exec(function(err, user){

        if(user.forms.indexOf(formId) == -1 && config.get("ADMIN_EMAILS").indexOf(req.user.email) == -1) {
            res.send({"success": false, "error": "Your account does not include this form"});
            return;
        }

        FormSchema.findById(formId).exec(function(err, formToDelete){
            res.render("removed.jade", {
                "title": "Form Removed",
                isAdmin: config.get("ADMIN_EMAILS").indexOf(req.user.email) != -1
            });
            formToDelete.remove();
        });
    });
});


module.exports = router;