var express = require('express'),
    router = express.Router(),
    config = require('../config'),
    oauth2 = require('../modules/oauth2'),
    UserSchema = require('../models/User'),
    FormSchema = require('../models/Form'),
    ObjectID = require('mongodb').ObjectID,
    Promise = require('promise'),
    fs = require('fs'),
    mime = require('mime'),
    Refresh = require('passport-oauth2-refresh'),
    google = require('googleapis'),
    googleAuth = require('google-auth-library'),
    GoogleSpreadsheet = require('google-spreadsheet'),
    GDriveHelpers = require('../modules/GDriveHelpers');


router.get('/view', function(req, res) {
    FormSchema.findById(req.query.id).exec(function(err, form) {
        res.render('view.jade', {
            title: form.title,
            form: form
        });
    });
});

function extractNames(fields) {
    var names = []
    for (var i = 0; i < fields.length; i++) {
        names.push(fields[i].name)
    }
    return names;
}

function createCSVHeader(fields){

    return extractNames(fields).join(",");
}

function has(form,field){
    if(form[field]!=undefined && form[field].length != 0)
        return true;
    return false;
}

function sendEmail(gmailService, fromName, to, from, subject, body, resolve, reject) {
    var email_lines = []
    email_lines.push('From: "'+fromName+'" <'+from+'>');
    email_lines.push('To: '+to);
    email_lines.push('Content-type: text/html;charset=iso-8859-1');
    email_lines.push('MIME-Version: 1.0');
    email_lines.push('Subject: '+subject);
    email_lines.push('');
    email_lines.push(body);
    var email = email_lines.join('\r\n').trim();

    var raw = new Buffer(email).toString('base64');
    raw = raw.replace(/\+/g, '-').replace(/\//g, '_');

    gmailService.users.messages.send({
        userId: 'me',
        resource: {
            raw: raw
        }
    }, function(err, res) {
        console.log("PROMISE END: SEND MESSAGE");
        if(err){
            reject(err);
            return;
        }
        resolve(true);
    });
}

router.post('/applicantsubmit', function(req, res) {
    console.log(req.body);
    console.log(req.files || []);

    UserSchema.findOne({forms: ObjectID(req.body.id)}).exec(function(err, user){
        console.log("found user");
        console.log("--------------------");
        var driveService = google.drive('v3'),
            sheetsService = google.sheets('v4'),
            gmailService = google.gmail('v1'),
            auth = new googleAuth();

        Refresh.requestNewAccessToken('google', user.refreshToken, function(err, access_token){
            user.accessToken = access_token;
            user.save();
            var oauth2Client = new auth.OAuth2(config.get('OAUTH2_CLIENT_ID'),config.get('OAUTH2_CLIENT_SECRET'),config.get('OAUTH2_CALLBACK'));
            oauth2Client.credentials = {
                access_token: user.accessToken,
                refresh_token: user.refreshToken
            };
            google.options({ auth: oauth2Client }); // set auth as a global default
            FormSchema.findById(req.body.id).exec(function(err, form){
                console.log("found form");
                console.log(form);
                console.log("--------------------");
                //create promises

                var initialPromises = []
                if(!has(form,"folderId")){
                    console.log("pushing createFormFolderPromise");
                    var createFormFolderPromise = new Promise(function (resolve, reject){
                        console.log('gonna createFormFolderPromise')
                        GDriveHelpers.createFile("Recruitment - "+form.title, "folder", driveService, null, resolve, reject);
                    });
                    initialPromises.push(createFormFolderPromise);
                }
                if(!has(form,"sheetsId")){
                    console.log("pushing createSpreadSheetPromise")
                    var createSpreadSheetPromise  = new Promise(function (resolve, reject){
                        console.log('gonna createSpreadSheetPromise')
                        GDriveHelpers.createFile("Recruitment - "+form.title, "spreadsheet", driveService, null, resolve, reject, createCSVHeader(form.fields));
                    });

                    initialPromises.push(createSpreadSheetPromise);
                }

                console.log("now im calling initialPromises");
                Promise.all(initialPromises).then(function (allResponses){
                    console.log("initial promises");
                    console.log(allResponses);
                    console.log("---------");

                    if(!has(form,"folderId")) {
                        form.folderId = allResponses[0];
                        if(!has(form,"sheetsId")) form.sheetsId = allResponses[1];
                    }
                    else {
                        if(!has(form,"sheetsId")) form.sheetsId = allResponses[0];
                    }
                    form.save();
                    console.log("gonna share spreadsheet");
                    GDriveHelpers.shareFile(driveService, form.sheetsId, function(err, response){
                        console.log("now im calling all the other promises");

                        var createApplicantFolderPromise = new Promise(function (resolve, reject){
                            console.log('PROMISE START: createApplicantFolderPromise')
                            GDriveHelpers.createFile(req.body['First Name']+" "+req.body['Last Name'], "folder", driveService, [form.folderId], resolve, reject);
                        });

                        Promise.all([createApplicantFolderPromise]).then(function (allResponses){ 
                            var applicantFolderId = allResponses[0];

                            var createDocPromise = new Promise(function (resolve, reject){
                                console.log('PROMISE START1: createDocPromise')
                                GDriveHelpers.createDoc(form.fields, req.body, driveService, [applicantFolderId], resolve, reject);
                            });
                            var uploadFilesPromise = new Promise(function (resolve, reject){
                                console.log('PROMISE START2: uploadFilesPromise')
                                GDriveHelpers.uploadFiles(req.files, driveService, [applicantFolderId], resolve, reject);
                            });
                            var insertInSpreadSheetPromise = new Promise(function (resolve, reject){
                                console.log('PROMISE START3: insert in spreadsheet')
                                var doc = new GoogleSpreadsheet(form.sheetsId, user.accessToken);
                                var creds = require('../auth.json');
                                GDriveHelpers.insertInSpreadSheet(extractNames(form.fields), req.body, doc, creds, resolve, reject);
                            });
                            var sendEmailToApplicantPromise = new Promise(function (resolve, reject){
                                console.log('PROMISE START4: email to applicant')
                                var subject = "Your Application has been received";
                                var body="<p>Dear "+req.body['First Name']+",</p>"+
                                         "<p>" + form.companyName + " has received your application and it's being reviewed.<br/>"+
                                         "We'll contact you to let you know the next step</p>";
                                if(has(form,"companyBannerUrl"))
                                    body+="<img style='display:block;' src='" + form.companyBannerUrl + "'></img>";

                                sendEmail(gmailService, form.companyName, req.body.Email, user.email, subject, body, resolve, reject);
                            });
                            var sendEmailToRecruiterPromise = new Promise(function (resolve, reject){
                                console.log('PROMISE START5: email to recruiter')
                                var subject = "A new job application has been received";
                                var folderLink = 'https://drive.google.com/drive/folders/'+applicantFolderId;
                                var body="<p>Dear "+ user.name + ",</p>"+
                                    "<p>" + form.companyName + " has received a new job application and it's waiting for your review.<br/>"+
                                    "<b>Applicant Name</b>: "+req.body['First Name']+" "+req.body['Last Name']+"<br />"+
                                    "<b>Applying for</b>: "+form.title+"<br />"+
                                    "Link to his Drive folder: "+folderLink+"<br />";

                                sendEmail(gmailService, form.companyName, form.recruiterEmail, user.email, subject, body, resolve, reject);
                            });


                            Promise.all([
                                    uploadFilesPromise,
                                    createDocPromise,
                                    insertInSpreadSheetPromise,  
                                    sendEmailToApplicantPromise,
                                    sendEmailToRecruiterPromise,
                                ]).
                                then(function (allResponses){
                                    console.log("otherPromises");
                                    console.log(allResponses);
                                    console.log("---------");
                                    res.render('submitted.jade', {
                                        title: 'Form Submitted',
                                        form: form
                                    });
                                }
                            );//end createApplicantFolderPromise, createDocPromise, uploadFilesPromise
                        }); //end create applicant promise

                        
                    });//end share spreadsheet
                    
                });//end createFormFolderPromise||&&createSpreadSheetPromise

            });//end get form

        });//end refresh access token

        
    });
});

module.exports = router;