var mongoose  = require('mongoose');
var Schema  = mongoose.Schema;

var FormSchema = new Schema({
    formId: String,
    title: String,
    recruiterEmail: String,
    companyName: String,
    companyBannerUrl: String,
    description: String,
    confirmationEmailForm: String,
    
    fields: [{
      name: String,
      type: String,
      isRequired: Boolean,
      options: [String]
    }]
}, {collection: 'Form'});

module.exports = mongoose.model('Form', FormSchema);