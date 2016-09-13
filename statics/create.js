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