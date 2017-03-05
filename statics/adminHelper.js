$(document).ready(function(){
	$(".EditMaxForms").click(function(){
		var max = prompt("Enter Max Number Of Forms");
		if (max!= null){
			document.location.href = "/admin/editMaxForms?id="+$(this).attr("userId")+"&max="+max;
		}
	});
	$(".EditMaxApplicants").click(function(){
		var max = prompt("Enter Max Number Of Applicants per Form");
		if (max!= null){
			document.location.href = "/admin/editMaxApplicants?id="+$(this).attr("userId")+"&max="+max;
		}
	});
});
