$(document).ready(function(){
    $.ajax({
    type: "POST",
    url: "/getform",
    data: {id: getUrlParameter("id")},
    success: function(ret){
      if(ret.success){

        $("#name-1-, #name-2-").prop("disabled",true);
        $("#isRequired-1-no, #isRequired-2-no").prop("disabled",true);
        $("#type-1-, #type-2-").prop("disabled",true);
        $("#remove-1-, #remove-2-").addClass("disabled");

        var form = ret.form;
        
        $("#title").val(form.title);
        $("#companyName").val(form.companyName);
        $("#description").val(form.description);
        $("#bannerUrl").val(form.bannerUrl);
        $("#recruiterEmail").val(form.recruiterEmail);

        for (var i = 1 ; i <= form.fields.length; i++) {
          addField();
          var field = form.fields[i-1];
          $("#name-"+i+"-").val(field.name);
          $("#type-"+i+"-").val(field.type);
          $("#type-"+i+"-").change();
          if(field.isRequired)
            $("input[name=isRequired-"+i+"-][value=yes]").prop("checked",true);
          else
            $("input[name=isRequired-"+i+"-][value=no]").prop("checked",true);
          $("#options-"+i+"-").val(field.options.join(","));
        }

      }//end if success
      else
        alert("An error has occured."+ret.error);
    }//end success()
  });

});