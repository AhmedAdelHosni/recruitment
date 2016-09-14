var mongoose  = require('mongoose');
var Schema  = mongoose.Schema;

var UserSchema = new Schema({
    uid: String,
    name: String,
    email: String,
    image: String,
    accessToken: String,
    refreshToken: String,
    forms: [{ type: Schema.ObjectId, ref: 'Form' }],
}, {collection: 'User'});

module.exports = mongoose.model('User', UserSchema);