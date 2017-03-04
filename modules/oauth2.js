// Copyright 2015-2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

var express = require('express'),
    config = require('../config'),
    url = require ('url'),
    google = require('googleapis'),
    GDriveHelpers = require('../modules/GDriveHelpers'),
    googleAuth = require('google-auth-library');

// [START setup]
var passport = require('passport');
var refresh = require('passport-oauth2-refresh');

var GoogleStrategy = require('passport-google-oauth20').Strategy;
var UserSchema = require('../models/User');

function extractProfile (profile) {
    var imageUrl = '';
    if (profile.photos && profile.photos.length) {
        imageUrl = profile.photos[0].value;
    }
    return {
        id: profile.id,
        email: profile.emails[0].value,
        displayName: profile.displayName,
        image: imageUrl
    };
}

// Configure the Google strategy for use by Passport.js.
//
// OAuth 2-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Google API on the user's behalf,
// along with the user's profile. The function must invoke `cb` with a user
// object, which will be set at `req.user` in route handlers after
// authentication.
var myGoogleStrategy = new GoogleStrategy({
    clientID: config.get('OAUTH2_CLIENT_ID'),
    clientSecret: config.get('OAUTH2_CLIENT_SECRET'),
    callbackURL: config.get('OAUTH2_CALLBACK'),
    accessType: 'offline'
}, function (accessToken, refreshToken, profile, cb) {
    var imageUrl = '';
    if (profile.photos && profile.photos.length) {
        imageUrl = profile.photos[0].value;
    }
    var query = {
        'gid':profile.id
    };
    var user = {
        "image": imageUrl,
        "gid": profile.id,
        "email": profile.emails[0].value,
        "name": profile.displayName,
        "accessToken": accessToken
    };
    if(refreshToken)
        user.refreshToken = refreshToken;

    UserSchema.findOne(query, function(err, userFound){
        if(userFound==null){ //signup

            ////////////////////////////////////////////////////////////////////////////////////////////////
            // create folder for user that would contain all forms folders and spreadsheets

            var refreshToken = user.refreshToken,
                driveService = google.drive('v3'),
                sheetsService = google.sheets('v4'),
                gmailService = google.gmail('v1'),
                auth = new googleAuth();

            var oauth2Client = new auth.OAuth2(config.get('OAUTH2_CLIENT_ID'),config.get('OAUTH2_CLIENT_SECRET'),config.get('OAUTH2_CALLBACK'));
            oauth2Client.credentials = {
                access_token: accessToken,
                refresh_token: refreshToken
            };
            google.options({ auth: oauth2Client }); // set auth as a global default

            var createFormFolderPromise = new Promise(function (resolve, reject){
                console.log('gonna createFormFolderPromise');
                GDriveHelpers.createFile("Recruitment", "folder", driveService, null, resolve, reject);
            });

            Promise.all([createFormFolderPromise]).then(function (allResponses){
                user.folderId = allResponses[0]; //get the user folder id

                //update user with folderId
                UserSchema.findOneAndUpdate(query, user, {upsert:true}, function(err, userUpdated){
                    // Extract the minimal profile information we need from the profile object
                    // provided by Google
                    cb(null, extractProfile(profile));
                });
            }); //todo: clean this up


            ////////////////////////////////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////////////////////////////////

        }//end if user signup
        //else login:

        UserSchema.findOneAndUpdate(query, user, {upsert:true}, function(err, userUpdated){
            // Extract the minimal profile information we need from the profile object
            // provided by Google
            cb(null, extractProfile(profile));
        });

    });


    
    
});

refresh.use(myGoogleStrategy);
passport.use(myGoogleStrategy);

passport.serializeUser(function (user, cb) {
    cb(null, user);
});
passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});
// [END setup]

var router = express.Router();

// [START middleware]
// Middleware that requires the user to be logged in. If the user is not logged
// in, it will redirect the user to authorize the application and then return
// them to the original URL they requested.
function authRequired (req, res, next) {
    if (!req.user) {
        req.session.oauth2return = req.originalUrl;
        return res.redirect('/notloggedin');
    }
    next();
}

// Middleware that exposes the user's profile as well as login/logout URLs to
// any templates. These are available as `profile`, `login`, and `logout`.
function addTemplateVariables (req, res, next) {
    res.locals.profile = req.user;
    res.locals.page = url.parse(req.url).pathname;
    res.locals.login = '/auth/login';
    res.locals.logout = '/auth/logout';
    next();
}
// [END middleware]

// Begins the authorization flow. The user will be redirected to Google where
// they can authorize the application to have access to their basic profile
// information. Upon approval the user is redirected to `/auth/google/callback`.
// If the `return` query parameter is specified when sending a user to this URL
// then they will be redirected to that URL when the flow is finished.
// [START authorize]
// Start OAuth 2 flow using Passport.js

router.get('/auth/login', passport.authenticate('google', {
                                        scope: ['email', 'profile', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/gmail.send'],
                                        accessType: 'offline',
                                        approvalPrompt: 'force'}));
// [END authorize]

// [START callback]
// OAuth 2 callback url. Use this url to configure your
// OAuth client in the Google Developers console
// Finish OAuth 2 flow using Passport.js
router.get('/auth/google/callback',passport.authenticate('google'),function (req, res) {
    // Redirect back to the original page, if any
    var redirect = '/';
    delete req.session.oauth2return;

    res.redirect(redirect);
  }
);
// [END callback]

// Deletes the user's credentials and profile from the session.
// This does not revoke any active tokens.
router.get('/auth/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

module.exports = {
    extractProfile: extractProfile,
    router: router,
    required: authRequired,
    template: addTemplateVariables
};