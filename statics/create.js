$(document).ready(function(){
    addField();
    addField();
    addField();
    $("#name-1-").val("First Name");
    $("#name-2-").val("Last Name");
    $("#name-3-").val("Email");

    $("#name-1-, #name-2-,#name-3-").prop("disabled",true);
    $("#isRequired-1-no, #isRequired-2-no, #isRequired-3-no").prop("disabled",true);
    $("#type-1-, #type-2-,#type-3-").prop("disabled",true);
    $("#remove-1-, #remove-2-,#remove-3-").addClass("disabled");
    $("#type-3-").val("Email");
});