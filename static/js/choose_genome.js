var projectTitleInputBox = document.getElementById("project-title-input");
var projectTitle = document.getElementById("project-title");
var editProjectTitleIcon = document.getElementById("edit-project-title");
var nextButton = document.getElementById("next-button");
var dropdown = document.getElementById("genome-selector");


nextButton.addEventListener("click", function(e){
	e.preventDefault();
        var pk = document.getElementById("pk-field").value;
	var target = e.target;
	var selection = dropdown.options[dropdown.selectedIndex].value

        var csrftoken = getCookie('csrftoken');

        xhr = new XMLHttpRequest();
        var pkField = document.getElementById("pk-field").value;
        xhr.open("POST", "/analysis/set-genome/" + pkField + '/');
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                                console.log('successful');
                        } else {
                                console.log('failed');
                        }
                }
        }
        xhr.send("selected_genome=" + selection);
        window.location.assign("/analysis/upload/" + pk + "/");
});


editProjectTitleIcon.addEventListener("click", function(e){
	e.target.style.display = "none";
            projectTitleInputBox.style.display = "inline-block";
            projectTitle.style.display = 'none';
            text = projectTitle.textContent;
            projectTitleInputBox.value = text;
	projectTitleInputBox.focus();
});

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

projectTitleInputBox.addEventListener("keyup", function(e){
	if (e.which == 13){
		e.target.blur();
	}
});

projectTitleInputBox.addEventListener("blur", function(e){
	editProjectTitleIcon.style.display = "inline";
	e.target.style.display = "none";
	var newName = projectTitleInputBox.value;
	projectTitle.textContent = newName;
	projectTitle.style.display = "inline";	

	var csrftoken = getCookie('csrftoken');
	console.log(csrftoken);
	
	xhr = new XMLHttpRequest();
	var pkField = document.getElementById("pk-field").value;
	xhr.open("POST", "/analysis/edit-name/" + pkField + '/');
	xhr.setRequestHeader("X-CSRFToken", csrftoken);
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				console.log('successful');
			} else {
				console.log('failed');
			}
		}
	}
	xhr.send("new_name=" + newName);
});
