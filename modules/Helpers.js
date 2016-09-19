function extractProperty(fields, propertyName) {
    var properties = []
    for (var i = 0; i < fields.length; i++) {
        properties.push(fields[i][propertyName])
    }
    return properties;
}

function createCSVHeader(fields){

    return extractProperty(fields, "name").join(",");
}

function has(form,field){
    if(form[field]!=undefined && form[field].length != 0)
        return true;
    return false;
}

module.exports = {
    has: has,
    createCSVHeader: createCSVHeader,
    extractProperty: extractProperty
}