var addNewSampleBtn = document.getElementById("add-new-sample-button");
var container = document.getElementById("add-sample-panel-inner");
var sampleEntryDialog = document.getElementById("sample-entry-box");
var addSampleDialogBtn = document.getElementById("add-sample-dialog-btn");
var cancelSampleDialogBtn = document.getElementById("cancel-sample-dialog-btn");

            window.addEventListener("dragover", function(e){
                e = e || event;
                e.preventDefault();
            });
            window.addEventListener("drop", function(e){
                e = e || event;
                e.preventDefault(); 
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

addNewSampleBtn.addEventListener("click", function(e){
        sampleEntryDialog.style.display = "block";
        document.getElementById("main-container").classList.add("blur");
});


cancelSampleDialogBtn.addEventListener("click", function(e){
        sampleEntryDialog.style.display = "none";
        document.getElementById("main-container").classList.remove("blur");	
});

addSampleDialogBtn.addEventListener("click", function(e){
        sampleEntryDialog.style.display = "none";
        document.getElementById("main-container").classList.remove("blur");
	var sampleEntry = document.getElementById("sample-entry-input");
	var samplename = sampleEntry.value;
	sampleEntry.value = ""; 

	var metaEntry = document.getElementById("sample-meta-input");
	var sampleMeta = metaEntry.value;
	metaEntry.value = ""; 

	//upload to db
        var pk = document.getElementById("pk-field").value;
        var xhr = new XMLHttpRequest();
        var csrftoken = getCookie('csrftoken');
        xhr.open("POST", "/analysis/create-sample/" + pk + "/");
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function(){
                if(xhr.readyState === 4){
                        if(xhr.status === 200){
				addNewSampleBox(samplename);
                        }
                        else{
                                console.log("Problem with adding samples");
                        }
                }
        }
        xhr.send("name="+samplename + "&metadata=" + sampleMeta);
});




addNewSampleBox = function(samplename){
	var outer = document.createElement("div");
	var inner1 = document.createElement("div");
	var inner2 = document.createElement("div");
	var inner3 = document.createElement("div");

	inner3.textContent = "x";
	inner3.className = "rm-sample";

	inner3.addEventListener("click", rmSample);


	outer.className = "sample-box";
	outer.setAttribute("samplename", samplename);
	inner1.className = "rp-div";
	inner2.className = "background-name";

	inner2.textContent = samplename;

	inner1.appendChild(inner3);
	inner1.appendChild(inner2);
	outer.appendChild(inner1);

	container.appendChild(outer);

	outer.addEventListener("dragover", dragOverFunc);
	outer.addEventListener("dragenter", dragEnterFunc);
	outer.addEventListener("drop", dropFunc);        
};


rmSample = function(e){
	var target = e.target;
	var parent = target.parentElement;
	var grandParent = parent.parentElement;
	var greatGrandParent = grandParent.parentElement;

	//check that the sample box is empty.  Not going to allow users to remove samples that have files assigned to them
	var enclosedSampleTags = grandParent.querySelectorAll('.sample-display');
	console.log(enclosedSampleTags);

	

	if (enclosedSampleTags == null){
		console.log('was empty');
	}
	else if (enclosedSampleTags.length > 0){
		console.log('was greater than zero');
		alert('You cannot remove a sample that has files assigned.  Remove the assigned files and try again.');
		return;
	}

	greatGrandParent.removeChild(grandParent);

        var pk = document.getElementById("pk-field").value;
        var samplename = grandParent.getAttribute("samplename");
        var xhr = new XMLHttpRequest();
        var csrftoken = getCookie('csrftoken');
        xhr.open("POST", "/analysis/remove-sample/" + pk + "/");
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function(){
                if(xhr.readyState === 4){
                        if(xhr.status === 200){
                                console.log('success');
                        }
                        else{
                                console.log("Problem with removing sample");
                        }
                }
        }
        xhr.send("samplename="+samplename);	
	
};

dragStartFunc = function(e){
    console.log('drag start!');
  e.dataTransfer.setData("text", e.target.id);
    e.dataTransfer.effectAllowed = "move";
    
};

dragEndFunc = function(e){
    console.log('dragend!');
    //e.dataTransfer.clearData();
};

dragEnterFunc = function(e){
    console.log('drag enter!');
    e.preventDefault();
    e.stopPropagation();
};

dragOverFunc =  function(e){
                    console.log('drag over!');

    e.preventDefault();
    e.stopPropagation();
};

dropFunc = function(e){
    console.log('dropped in ' + e.target.id);
    e.preventDefault();
    var id = e.dataTransfer.getData("text");
    e.target.appendChild(document.getElementById(id));
    e.stopPropagation();
    checkAllAssigned();
};

dragLeaveFunc =  function(e){
    console.log('left area!');
    console.log(e.target);
    e.preventDefault();
    e.stopPropagation();
};

dropTargets = document.getElementsByClassName("sample-box");
for(var i=0; i<dropTargets.length; i++){
	var a = dropTargets[i];
	a.addEventListener("dragover", dragOverFunc);
	a.addEventListener("dragenter", dragEnterFunc);
	a.addEventListener("drop", dropFunc);        
}

draggableElements = document.getElementsByClassName("sample-display");
for(var i=0; i<draggableElements.length; i++){
	var a = draggableElements[i];
	a.addEventListener("dragstart", dragStartFunc);            
	a.addEventListener("dragend", dragEndFunc);
}

checkAllAssigned = function(){
	var proceedPanel =  document.getElementById("proceed-to-summary-panel");
	var filesPanel =  document.getElementById("existing-files-panel");
	var wrapper =  document.getElementById("existing-files-wrapper");
	if (wrapper.children.length === 0){
		filesPanel.style.display = 'none';
		proceedPanel.style.display = 'block';
	}
}


var goToSummaryBtn = document.getElementById("go-to-summary-btn");
goToSummaryBtn.addEventListener("click", function(e){
	var sampleBoxes = document.getElementsByClassName("sample-box");
	var sampleToFileMapping = {};
	for(var i=0; i<sampleBoxes.length; i++){
		var box = sampleBoxes[i];
		var samplename = box.getAttribute("samplename");
		sampleToFileMapping[samplename] = []; 
		var descendants =  box.querySelectorAll(".sample-display");
		console.log(descendants);
		for(var j=0; j<descendants.length; j++){
			var attr = descendants[j].getAttribute("filename");
			sampleToFileMapping[samplename].push(attr);
		}
	}
	console.log(sampleToFileMapping);
	createMappings(JSON.stringify(sampleToFileMapping));
});

//createMappings = function(jsonStr){
//
//        var pk = document.getElementById("pk-field").value;
//
//        var xhr = new XMLHttpRequest();
//        var csrftoken = getCookie('csrftoken');
//        xhr.open("POST", "/analysis/map-files/" + pk + "/");
//        xhr.setRequestHeader("X-CSRFToken", csrftoken);
//        //xhr.setRequestHeader('Content-type', 'application/json');
//	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
//        xhr.onreadystatechange = function(){
//                if(xhr.readyState === 4){
//                        if(xhr.status === 200){
//                                console.log('success');
//				window.location.assign("/analysis/summary/" + pk + "/");
//                        }
//                        else{
//                                console.log("Problem with updating samples");
//                        }
//                }
//        }
//        xhr.send("mapping="+jsonStr);
//};


createMappings = function(jsonStr){

        var pk = document.getElementById("pk-field").value;

        var xhr = new XMLHttpRequest();
        var csrftoken = getCookie('csrftoken');
        xhr.open("POST", "/analysis/map-files/" + pk + "/");
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
        //xhr.setRequestHeader('Content-type', 'application/json');
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function(){
                if(xhr.readyState === 4){
                        if(xhr.status === 200){
                                console.log('success');
				window.location.assign("/analysis/summary/" + pk + "/");
                        }
                        else{
                                console.log("Problem with updating samples");
                        }
                }
        }
        xhr.send("mapping="+jsonStr);
};

document.addEventListener("DOMContentLoaded", function () {
	checkAllAssigned();
	var sampleBoxes = document.getElementsByClassName('rm-sample');
	for (var i = 0; i < sampleBoxes.length; i++) {
	    sampleBoxes[i].addEventListener('click', rmSample, false);
	}	
}, false);
