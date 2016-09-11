var mongoose  = require('mongoose');
var Schema  = mongoose.Schema;

var FormSchema = new Schema({
    formId: String,
    name: String,
    email: String,
    fields: [{
      name: String,
      type: String,
      isRequired: Boolean,
      options: [String]
    }]
}, {collection: 'Form'});

module.exports = mongoose.model('Form', FormSchema);