var express = require('express');
var router = express.Router();
var config = require('../config');
var oauth2 = require('../modules/oauth2');
var UserSchema = require('../models/User');
var FormSchema = require('../models/Form');
var ObjectID = require('mongodb').ObjectID;
var Promise = require('promise');
var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var mime = require('mime');
var Refresh = require('passport-oauth2-refresh');
var GoogleSpreadsheet = require('google-spreadsheet');


router.get('/view', function(req, res) {
    FormSchema.findById(req.query.id).exec(function(err, form) {
        res.render('view.jade', {
            title: form.title,
            form: form
        });
    });
});


function shareSpreadSheet(driveService, sheetsId, callback) {
    var email = require('../auth.json').client_email;
    driveService.permissions.create({
        resource: {
            'type': 'user',
            'role': 'writer',
            'emailAddress': email
        },
        fileId: sheetsId,
        fields: 'id',
    }, callback);
}

function insertInSpreadSheet(fieldNames, formData, sheetsId, sheetsService, accessToken, resolve, reject) {
    var row = {}
    for(var i = 0; i < fieldNames.length; i++){
        row[fieldNames[i]] = formData[fieldNames[i]] || "";
    }
    var doc = new GoogleSpreadsheet(sheetsId, accessToken);
    var creds = require('../auth.json');
    doc.useServiceAccountAuth(creds, function(err, res){
        doc.addRow(1, row , function(err, res){
            console.log("PROMISE END: insertInSpreadSheet");
            if(err){
                reject(err);
                return;
            }
            else
                resolve(true);
        });
    });
}

function createFile(fileName, mimeType, driveService, parentsIds, resolve, reject, lineToInsert) {
    var mimeTypes = {
        "folder": 'application/vnd.google-apps.folder',
        "spreadsheet": 'application/vnd.google-apps.spreadsheet'
    }
    var fileMetaData = {
        'name' : fileName,
        'mimeType' : mimeTypes[mimeType],
    };
    if(parentsIds != null)
        fileMetadata.parents = parentsIds;

    var params = {
        resource: fileMetaData,
        fields: "id"
    };
    if(mimeType == "spreadsheet" && lineToInsert){
        params.media = {
            mimeType: 'text/csv',
            body: lineToInsert
        }    
    }
    
    driveService.files.create(params,
    function(err, file) {
        console.log("PROMISE END: I create file/folder, file.id="+file.id);
        if(err){
            reject(err);
            return;
        }
        resolve(file.id);
    });

}

function createDoc(fields, formData, driveService, parentsIds, resolve, reject) {
    var body = "\
    <body> \
        <h2 style='text-align:center;'> "+formData['First Name']+" "+formData["Last Name"]+"</h2> \
        <table style='border: solid;'> ";
    for (var i = 0; i < fields.length; i++) {
        if(fields[i].type.toLowerCase()=="file") continue;
        if(fields[i].name.toLowerCase()=="first name"||fields[i].name.toLowerCase()=="last name") continue;
        body+="<tr style='padding: 10px;'> \
                <td> "+fields[i].name+"</td> \
                <td> "+formData[fields[i].name]+"</td> \
            </tr>";
    }
    body+="</table></body>";

    var fileMetaData = {
        'name' : formData['First Name'] + ' ' + formData['Last Name'],
        'mimeType': 'application/vnd.google-apps.document',
        parents: parentsIds,
    };

    var media = {
        mimeType: 'text/html',
        body: body
    }
    driveService.files.create({
        resource: fileMetaData,
        fields: "id",
        media: media
    },
    function(err, file) {
        console.log("PROMISE END: I create doc, file.id="+file.id);
        if(err){
            reject(err);
            return;
        }
        resolve(true);
    });
}

function uploadFile(name, path, driveService, parentsIds, resolve, reject) {
    var fileMetadata = {
        'name': name,
        parents: parentsIds,
    };
    var media = {
        mimeType: mime.lookup(name),
        body: fs.createReadStream(path)
    };
    driveService.files.create({
       resource: fileMetadata,
       media: media,
       fields: 'id'
    },
    function(err, file) {
        console.log("END SUB PROMISE: upload file, have file.id="+file.id);
        if(err){
            reject(err);
            return;
        }
        resolve(file.id);
    });
}

function uploadFiles(files, driveService, parentsIds, resolve, reject) {
    var allFilesPromises = [];
    for (var i = files.length - 1; i >= 0; i--) {

        var filePromise = new Promise(function (resolve, reject){
            uploadFile(files[i].originalname,files[i].path, driveService, parentsIds, resolve, reject);
        }); //end promise

        allFilesPromises.push(filePromise);
    }

    Promise.all(allFilesPromises).then(function (allFilesResponses){
        console.log("PROMISE END: UPLOAD FILES");
        resolve(allFilesResponses);
    });
}

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

function sendMessage(gmailService, fromName, to, from, subject, body, resolve, reject) {
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
        var refreshToken = user.refreshToken;
        var driveService = google.drive('v3');
        var sheetsService = google.sheets('v4');
        var gmailService = google.gmail('v1');
        var auth = new googleAuth();
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
                        createFile("Recruitment - "+form.title, "folder", driveService, null, resolve, reject);
                    });
                    initialPromises.push(createFormFolderPromise);
                }
                if(!has(form,"sheetsId")){
                    console.log("pushing createSpreadSheetPromise")
                    var createSpreadSheetPromise  = new Promise(function (resolve, reject){
                        console.log('gonna createSpreadSheetPromise')
                        createFile("Recruitment - "+form.title, "spreadsheet", driveService, null, resolve, reject, createCSVHeader(form.fields));
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
                    shareSpreadSheet(driveService, form.sheetsId, function(err, res){
                        console.log("now im calling all the other promises");

                        var createApplicantFolderPromise = new Promise(function (resolve, reject){
                            console.log('PROMISE START: createApplicantFolderPromise')
                            createFile(req.body['First Name']+" "+req.body['Last Name'], "folder", driveService, [form.folderId], resolve, reject);
                        });

                        Promise.all([createApplicantFolderPromise]).then(function (allResponses){ 
                            var applicantFolderId = allResponses[0];

                            var createDocPromise = new Promise(function (resolve, reject){
                                console.log('PROMISE START: createDocPromise')
                                createDoc(form.fields, req.body, driveService, [applicantFolderId], resolve, reject);
                            });
                            var uploadFilesPromise = new Promise(function (resolve, reject){
                                console.log('PROMISE START: uploadFilesPromise')
                                uploadFiles(req.files, driveService, [applicantFolderId], resolve, reject);
                            });
                            var insertInSpreadSheetPromise = new Promise(function (resolve, reject){
                                console.log('PROMISE START: insert in spreadsheet')
                                var myGoogleSpreadsheet = new GoogleSpreadsheet(form.sheetsId, accessToken);
                                insertInSpreadSheet(extractNames(form.fields), req.body, form.sheetsId, sheetsService, accessToken, resolve, reject);
                            });
                            var sendEmailToApplicantPromise = new Promise(function (resolve, reject){
                                console.log('PROMISE START: email to applicant')
                                var subject = "Your Application has been received";
                                var body="<p>Dear "+req.body['First Name']+",</p>"+
                                         "<p>" + form.companyName + " has received your application and it's being reviewed.<br/>"+
                                         "We'll contact you to let you know the next step</p>";
                                if(has(form,"companyBannerUrl"))
                                    body+="<img style='display:block;' src='" + form.companyBannerUrl + "'></img>";

                                sendMessage(gmailService, form.companyName, req.body.Email, user.email, subject, body, resolve, reject);
                            });
                            var sendEmailToRecruiterPromise = new Promise(function (resolve, reject){
                                console.log('PROMISE START: email to recruiter')
                                var subject = "A new job application has been received";
                                var folderLink = 'https://drive.google.com/drive/folders/'+form.folderId;
                                var body="<p>Dear "+ user.name + ",</p>"+
                                    "<p>" + form.companyName + " has received a new job application and it's waiting for your review.<br/>"+
                                    "<b>Applicant Name</b>: "+req.body['First Name']+" "+req.body['Last Name']+"<br />"+
                                    "<b>Applying for</b>: "+form.title+"<br />"+
                                    "Link to his Drive folder: "+folderLink+"<br />";

                                sendMessage(gmailService, form.companyName, form.recruiterEmail, user.email, subject, body, resolve, reject);
                            });


                            Promise.all([
                                    uploadFilesPromise,
                                    createDocPromise,
                                    insertInSpreadSheetPromise,
                                    sendEmailToApplicantPromise,
                                    sendEmailToRecruiterPromise,
                                ]).then(function (allResponses){
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