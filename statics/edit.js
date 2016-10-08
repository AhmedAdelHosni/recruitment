function loadDataIntoFields(data) {
  for (var i = formFields.length - 1; i >= 0; i--) {
    $("#"+formFields[i]).val(data[formFields[i]]);
  }
}

$(document).ready(function(){
    $.ajax({
    type: "POST",
    url: "/getform",
    data: {id: getUrlParameter("id")},
    success: function(ret){
      if(ret.success){
        var form = ret.form;

        loadDataIntoFields(form);

        for (var i = 1 ; i <= form.fields.length; i++) {
          //1-name 2-type 3-options 4-sizelimit 5-required
          insertNewField();
          var field = form.fields[i-1];
          $("#name-"+i+"-").val(field.name);
          $("#type-"+i+"-").val(field.type);
          $("#type-"+i+"-").change();
          $("#options-"+i+"-").val(field.options.join(","));
          $("#sizelimit-"+i+"-").val(field.sizelimit);

          if(field.isRequired)
            $("input[name=isRequired-"+i+"-][value=yes]").prop("checked",true);
          else
            $("input[name=isRequired-"+i+"-][value=no]").prop("checked",true);
        }

        for (var i = 1; i<= form.emailFields.length; i++){
          $("#email"+i).val(form.emailFields[i-1]);
        }

        $("#name-1-, #name-2-,#name-3-").prop("disabled",true);
        $("#isRequired-1-no, #isRequired-2-no, #isRequired-3-no").prop("disabled",true);
        $("#type-1-, #type-2-, #type-3-").prop("disabled",true);
        $("#remove-1-, #remove-2-, #remove-3-").addClass("disabled");

      }//end if success
      else
        alert("An error has occured."+ret.error);
    }//end success()
  });

});