var currentFieldIndex = 0;

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
         <select class="form-control typeselect" name="type--" id="type--" required> \
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
         <input type="text" name="options--" id="options--" class="form-control" placeholder="E.g: option1,option2"> \
         <small class="form-text text-muted" id="optionshelp--">Help Text</small> \
        </div> \
      </div> \
   </div> \
</div>';

function showOptions(index) {
    $("#optionsdiv-"+index+"-").show();
    $("#options-"+index+"-").prop("required",true);
    if($("#type-"+index+"-").val() == "File") {
      $("#optionshelp-"+index+"-").html("Please input valid file extensions.");
      $("#options-"+index+"-").prop("placeholder","doc,docx,pdf");
    }
    else if ($("#type-"+index+"-").val() == "Select"){
      $("#optionshelp-"+index+"-").html("Please input valid options.");
      $("#options-"+index+"-").prop("placeholder","option1,option2");
    }
}

function hideOptions(index) {
    $("#optionsdiv-"+index+"-").hide();
    $("#options-"+index+"-").removeProp("required");
    $("#options-"+index+"-").val("");
}

function addField() {
    currentFieldIndex++;
    $("#fields").append(replaceAll(field,"--","-"+currentFieldIndex+"-"));
}

function extractIndex(id) {
    return parseInt(id.split("-")[1]);
}
function replaceAll(str,search,replace){
    return str.split(search).join(replace);
}

$(document).on("change", ".typeselect", function(){
    var index = extractIndex($(this).prop("id"));
    if($(this).val()=="File" || $(this).val() == "Select")
      showOptions(index);
    else 
      hideOptions(index);
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

function constructData() {
  var data = {
        title: $("#title").val(),
        companyName: $("#companyName").val(),
        description: $("#description").val(),
        bannerUrl: $("#bannerUrl").val(),
        recruiterEmail: $("#recruiterEmail").val()
    };

    if(getUrlParameter("id")){
      console.log("got id="+getUrlParameter("id"))
      data.id = getUrlParameter("id");
    }
    console.log("id=");console.log(getUrlParameter("id"));

    var fields = [];
    for (var i = 1; i <= currentFieldIndex ; i++) {
        var field = {
            name : $("#name-"+i+"-").val(),
            type : $("#type-"+i+"-").val(),
            isRequired : $("input[name=isRequired-"+i+"-]:checked").val() == "yes" ? true : false
        };
        
        if($("#options-"+i+"-").val() == undefined || $("#options-"+i+"-").val() == "")
          field.options = [""];
        else {
          field.options = $("#options-"+i+"-").val().split(",")
          for (var j = field.options.length - 1; j >= 0; j--)
            field.options[j] = $.trim(field.options[j]);
        }

        fields.push(field);
    }

    for (var i = fields.length - 1; i >= 0; i--)
      for (var j = i - 1; j >= 0; j--)
        if($.trim(fields[i].name.toLowerCase()) == $.trim(fields[j].name.toLowerCase()))
          return false;

    data.fields = JSON.stringify(fields);
    return data;
}


function submitData(data) {
  var url = "/submitform";
  $.ajax({
    type: "POST",
    url: url,
    data: data,
    success: function(ret){
      if(ret.success)
        window.location = "/edit?id="+ret.formId;
      else
        alert("An error has occured.");
    }
  });
}

$(document).on("click", "#submit", function(event){
    fields = $('input,textarea,select').filter('[required]:visible');
    var flag = false;
    for (var i = fields.length - 1; i >= 0; i--) 
        if( $(fields[i]).is(':invalid') )
            return;

    var data = constructData();

    if(data == false){
        alert("You can not have two fields with the same name.");
        return false;
    }
    
    submitData(data);
    return false;
});

