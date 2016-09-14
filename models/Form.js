var mongoose  = require('mongoose');
var Schema  = mongoose.Schema;

var FormSchema = new Schema({
    title: String,
    recruiterEmail: String,
    companyName: String,
    companyBannerUrl: String,
    description: String,
    confirmationEmailForm: String,
    folderId: String,
    sheetsId: String,
    fields: { type: Array }
}, {collection: 'Form'});

// FormSchema.pre('remove', function(next) {
//     this.model('Assignment').remove({ person: this._id }, next);
// });

module.exports = mongoose.model('Form', FormSchema);