var express = require('express'),
    router = express.Router(),
    mongodb = require('../modules/db'),
    mongoose = require('mongoose'),
    ObjectID = require('mongodb').ObjectID,
    EventHittupsSchema = require('../models/User');

function signin(req, callback) {
    var HQImageurl = req.body.HQImageurl;
    var uid = req.body.uid;

    callback({"success": "true"});
}

module.exports = {
    signin: signin
};