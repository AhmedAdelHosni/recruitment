var Promise = require('promise'),
    fs = require('fs'),
    mime = require('mime');

function resolveIDCallback(resolve, reject, err, res) {
    if(err){
        console.log(err);
        reject(err);
    }
    else {
        console.log(res);
        resolve(res.id);
    }
}

function shareFile(driveService, fileId, callback) {
    console.log("I'm in shareFile");
    var email = require('../auth.json').client_email;
    console.log(email);
    driveService.permissions.create({
        resource: {
            'type': 'user',
            'role': 'writer',
            'emailAddress': email
        },
        fileId: fileId,
        fields: 'id',
    }, callback);
}

/* 
doc: GoogleSpreadsheet object
*/
function insertInSpreadSheet(fieldNames, formData, doc, creds, folderLink, resolve, reject) {
    var row = {}
    for(var i = 0; i < fieldNames.length; i++){
        row[fieldNames[i]] = formData[fieldNames[i]] || "";
    }
    row["folder link"] = folderLink;
    doc.useServiceAccountAuth(creds, function(err, res){
        doc.addRow(1, row , function(err, res){
            if(err){
                console.log(err);
                reject(err);
            }
            else {
                console.log(res);
                resolve(true);
            }
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
        fileMetaData.parents = parentsIds;
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
    
    driveService.files.create(params, resolveIDCallback.bind(undefined, resolve, reject));

}

function createDoc(fields, formData, driveService, parentsIds, resolve, reject) {
    var body = "\
    <body> \
        <h2 style='text-align:center;'> "+formData['First Name']+" "+formData["Last Name"]+"</h2> \
        <table style='border: solid;'> ";
    for (var i = 0; i < fields.length; i++) {
        var value = "";
        if(fields[i].type.toLowerCase()=="file") continue;
        if(fields[i].name.toLowerCase()=="first name"||fields[i].name.toLowerCase()=="last name") continue;
        body+="<tr style='padding: 10px;'> \
                <td> "+fields[i].name+"</td> ";
        if(formData[fields[i].name])
            value = formData[fields[i].name];
        body+="<td> "+value+"</td>";
        body+="</tr>";
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
    }, resolveIDCallback.bind(undefined, resolve, reject));
}

function uploadFile(name, buffer, driveService, parentsIds, resolve, reject) {
    var fileMetaData = {
        'name': name,
        parents: parentsIds,
    };
    var media = {
        mimeType: mime.lookup(name),
        body: buffer
    };
    driveService.files.create({
       resource: fileMetaData,
       media: media,
       fields: 'id'
    }, resolveIDCallback.bind(undefined, resolve, reject));
}

function uploadFiles(files, driveService, parentsIds, resolve, reject) {
    var allFilesPromises = [];
    for (var i = files.length - 1; i >= 0; i--) {
        var filePromise = new Promise(function (resolve, reject){
            uploadFile(files[i].originalname, files[i].buffer, driveService, parentsIds, resolve, reject);
        }); //end promise
        allFilesPromises.push(filePromise);
    }

    Promise.all(allFilesPromises).then(function (allFilesResponses){
        console.log("PROMISE END: UPLOAD FILES responses=");
        console.log(allFilesResponses);
        
        resolve(allFilesResponses);
        console.log("resolving now uploadFiles");
    });
}


module.exports = {
    uploadFiles: uploadFiles,
    createDoc: createDoc,
    createFile: createFile,
    shareFile: shareFile,
    insertInSpreadSheet: insertInSpreadSheet
}