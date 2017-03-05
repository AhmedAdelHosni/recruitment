var UserSchema = require('./User'),
    mongoose  = require('mongoose'),
    Schema  = mongoose.Schema,
    ObjectID = require('mongodb').ObjectID;

var FormSchema = new Schema({
    title: String,
    companyName: String,
    companyBannerUrl: String,
    emailImageUrl: String,
    bgColor: String,
    emailFields: { type: Array },
    description: String,
    confirmationEmailForm: String,
    folderId: String,
    sheetsId: String,
    fields: { type: Array },
    numOfApplicants: Number,
}, {collection: 'Form'});

//delete form from user
FormSchema.pre('remove', function(next) {
    UserSchema.update({ forms: this._id},{ $pull: { forms: this._id } }, next);
});

module.exports = mongoose.model('Form', FormSchema);