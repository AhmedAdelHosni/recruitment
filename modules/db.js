// Credit DB export to: http://kroltech.com/2015/01/02/simple-mongodb-node-js-client-module/
(function () {
    var client = require('mongodb').MongoClient,
        mongodb;
 	var mongoose = require('mongoose');

    module.exports =  {
        connect: function (dburl, callback) {
            client.connect(dburl,
                function (err, db) {
                    mongodb = db;
                    if(callback) { callback(); }
                });
            mongoose.connect(dburl);
        },
        db: function () {
            return mongodb;
        },
        close: function () {
            mongodb.close();
        }
    };
})();