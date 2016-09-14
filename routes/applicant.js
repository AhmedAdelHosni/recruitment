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


router.get('/view', function(req, res) {
    FormSchema.findById(req.query.id).exec(function(err, form) {
        res.render('view.jade', {
            title: form.title,
            form: form
        });
    });
});

function createFile(fileName, mimeType, service, resolve, reject, lineToInsert) {
    var mimeTypes = {
        "folder": 'application/vnd.google-apps.folder',
        "spreadsheet": 'application/vnd.google-apps.spreadsheet'
    }
    var fileMetaData = {
        'name' : fileName,
        'mimeType' : mimeTypes[mimeType]
    };
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
    
    service.files.create(params,
    function(err, file) {
        if(err){
            console.log("file err:");
            console.log(err);
            reject(err);
        }
        console.log("I create file/folder, resolved file.id="+file.id);
        resolve(file.id);
    });
}

function createDoc(fields, formData, service, resolve, reject) {
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
        'mimeType': 'application/vnd.google-apps.document'
    };
    var media = {
        mimeType: 'text/html',
        body: body
    }
    service.files.create({
        resource: fileMetaData,
        fields: "id",
        media: media
    },
    function(err, file) {
        if(err){
            console.log("file err:");
            console.log(err);
            reject(err);
        }
        console.log("I create doc, resolved file.id="+file.id);
        resolve(file.id);
    });
}

function uploadFile(name, path,service, resolve, reject) {
    path = "/Users/bubakazouba/recruitmentapp/default/"+path;
    console.log("uploading file path= "+path);
    var fileMetadata = {
        'name': name
    };
    var media = {
        mimeType: mime.lookup(name),
        body: fs.createReadStream(path)
    };
    service.files.create({
       resource: fileMetadata,
       media: media,
       fields: 'id'
    },
    function(err, file) {
        if(err){
            console.log("file err:");
            console.log(err);
            reject(err);
        }
        console.log("I upload file, have resolved file.id="+file.id);
        resolve(file.id);
    });
}

function uploadFiles(files, service, resolve, reject) {
    var allFilesPromises = [];
    for (var i = files.length - 1; i >= 0; i--) {

        var filePromise = new Promise(function (resolve, reject){
            uploadFile(files[i].originalname,files[i].path, service, resolve, reject);
        }); //end p

        allFilesPromises.push(filePromise);
    }

    Promise.all(allFilesPromises).then(function (allFilesResponses){
        resolve(allFilesResponses);
    });
}

function createCSVHeader(fields){
    var names = []
    for (var i = 0; i < fields.length; i++) {
        names.push(fields[i].name)
    }
    return names.join(",")
}

function has(form,field){
    if(form[field]!=undefined && form[field].length != 0)
        return true;
    return false;
}

router.post('/applicantsubmit', function(req, res) {
    console.log(req.body);
    UserSchema.findOne({forms: ObjectID(req.body.id)}).exec(function(err, user){
        console.log("found user");
        console.log("--------------------");
        var accessToken = user.accessToken;
        var refreshToken = user.refreshToken;
        var service = google.drive('v3');
        var auth = new googleAuth();
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
                    createFile("Recruitment - "+form.title, "folder", service, resolve, reject);
                });
                initialPromises.push(createFormFolderPromise);
            }
            if(!has(form,"sheetsId")){
                console.log("pushing createSpreadSheetPromise")
                var createSpreadSheetPromise  = new Promise(function (resolve, reject){
                    console.log('gonna createSpreadSheetPromise')
                    createFile("Recruitment - "+form.title, "spreadsheet", service, resolve, reject, createCSVHeader(form.fields));
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
                console.log("now im calling all the other promises");

                var createApplicantFolderPromise = new Promise(function (resolve, reject){
                    console.log('gonna createApplicantFolderPromise')
                    createFile(req.body['First Name']+" "+req.body['Last Name'], "folder", service, resolve, reject);
                });
                var createDocPromise = new Promise(function (resolve, reject){
                    console.log('gonna createDocPromise')
                    createDoc(form.fields, req.body, service, resolve, reject);
                });
                var uploadFilesPromise = new Promise(function (resolve, reject){
                    console.log('gonna uploadFilesPromise')
                    uploadFiles(req.files, service, resolve, reject);
                });
                // var insertInSpreadSheetPromise = new Promise(function (resolve, reject){
                //     insertInSpreadSheet(req.body, service, resolve, reject);
                // });


                Promise.all([createApplicantFolderPromise, createDocPromise, uploadFilesPromise]).then(function (allResponses){

                    //move doc and uploaded files to form-folder/applicantfolder
                    console.log("otherPromises");
                    console.log(allResponses);
                    console.log("---------");
                });//end createApplicantFolderPromise, createDocPromise, uploadFilesPromise
            });//end createFormFolderPromise||&&createSpreadSheetPromise

        });
    });
});

module.exports = router;