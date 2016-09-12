var field =// change id,name,for
'<div id="field--" style="border: 2px;border-style: dotted;padding: 10px;margin: 8px;" class="container"> \
   <div class="form-group row"> \
      <label for="name--" class="col-sm-2 col-form-label">Field Name:</label> \
      <div class="col-sm-3"> \
        <input type="text" name="name--" id="name--" class="form-control" required> \
      </div> \
      \
      <label for="type--" class="col-sm-2 col-form-label">Field Type:</label> \
      <div class="col-sm-3"> \
         <select class="form-control" id="type--" required> \
            <option selected>Text</option> \
            <option>Number</option> \
            <option>Email</option> \
            <option>Date</option> \
            <option>Select</option> \
            <option>File</option> \
         </select> \
      </div> \
      <div class="col-sm-2"><button id="remove--" type="button" class="btn btn-danger removeField">Remove Field</button></div> \
   </div> \
   <div class="form-group row"> \
      <label for="isRequired--" class="col-sm-2 col-form-label">Required:</label> \
      <label class="form-check-inline col-sm-2"> \
         <input type="radio" name="isRequired--" id="isRequired--yes" value="yes" checked class="form-check-input"> &nbsp;&nbsp;Yes \
      </label> \
      \
      <label class="form-check-inline col-sm-1"> \
         <input type="radio" name="isRequired--" id="isRequired--no" value="no" class="form-check-input">&nbsp;&nbsp;No \
      </label> \
      \
      <div id="optionsdiv--" style="display: none;">\
        <label for="options--" class="col-sm-2 col-form-label">Options:</label> \
        <div class="col-sm-3"> \
         <input type="text" name="options--" id="options--" class="form-control"> \
        </div> \
      </div> \
   </div> \
</div>';
jQuery.extend(jQuery.expr[':'], {
    invalid : function(elem, index, match){
        var invalids = document.querySelectorAll(':invalid'),
            result = false,
            len = invalids.length;

        if (len) {
            for (var i=0; i<len; i++) {
                if (elem === invalids[i]) {
                    result = true;
                    break;
                }
            }
        }
        return result;
    }
});

var currentFieldIndex = 0;

function showOptions(index) {
    $("#optionsdiv-"+index+"-").show();
    $("#options-"+index+"-").prop("required");
}

function hideOptions(index) {
    $("#optionsdiv-"+index+"-").hide();
    $("#options-"+index+"-").removeProp("required");
}

function addField() {
    currentFieldIndex++;
    $("#fields").append(replaceAll(field,"--","-"+currentFieldIndex+"-"));
    // $("#fields").append(field.replace(/--/g,"-"+currentFieldIndex+"-"));
}
function extractIndex(id) {
    return parseInt(id.split("-")[1]);
}
function replaceAll(str,search,replace){
    return str.split(search).join(replace);
}

$(document).ready(function(){
    addField();
    addField();
    $("#name-1-").val("First Name");
    $("#name-2-").val("Last Name");

    $("#name-1-, #name-2-").prop("disabled",true);
    $("#isRequired-1-no, #isRequired-2-no").prop("disabled",true);
    $("#type-1-, #type-2-").prop("disabled",true);
    $("#remove-1-, #remove-2-").addClass("disabled");
});

$(document).on("click", "#addFieldBtn", function(){
    addField();
});

$(document).on("click", ".removeField", function(){
    var index = extractIndex($(this).prop('id'));
    $("#field-"+index+"-").remove();
    for (var i = index + 1; i <= currentFieldIndex; i++) {
        document.body.innerHTML = replaceAll(document.body.innerHTML,"-"+i+"-","-"+(i-1)+"-");
    }
    currentFieldIndex--;
});

$(document).on("click", "#submit", function(event){
    fields = $('input,textarea,select').filter('[required]:visible');
    var flag = false;
    for (var i = fields.length - 1; i >= 0; i--) 
        if( $(fields[i]).is(':invalid') )
            flag = true;
    if(flag)
        return;
    

    var json = {
        title: $("#title").val(),
        companyName: $("#companyName").val(),
        exampleTextarea: $("#exampleTextarea").val(),
        bannerUrl: $("#bannerUrl").val(),
        fields: []
    };
    for (var i = 1; i <= currentFieldIndex ; i++) {
        json.fields.push({
            name : $("#name-"+i+"-").val(),
            type : $("#type-"+i+"-").val(),
            options : $("#options-"+i+"-").val(),
            isRequired : $("input[name=isRequired-"+i+"-]:checked").val()
        });
    }
    var allFieldNames = []
    for (var i = json.fields.length - 1; i >= 0; i--)
        allFieldNames.push(json.fields[i].name);
    uniqueArray = allFieldNames.filter(function(item, pos) {
        return allFieldNames.indexOf(item) == pos;
    });
    if(uniqueArray.length != allFieldNames.length){
        flag = true;
    }

    if(flag){
        alert("You can not have two fields with the same name.");
        // event.preventDefault();
        return false;
    }
    alert("success");
    // event.preventDefault();
    return false;
});
