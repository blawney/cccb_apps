var filesUpload = document.getElementById("files-upload");
var dropArea = document.getElementById("drop-area");
var uploadListDisplay = document.getElementById("files-to-upload-display");
var uploadButton = document.getElementById("upload-button");
var uploadCounter = 0;
var currentUploadObjects = 0;
projectTitleInputBox = document.getElementById("project-title-input");
projectTitle = document.getElementById("project-title");
editProjectTitleIcon = document.getElementById("edit-project-title");
var confirmationDialog = document.getElementById("confirm-delete-box");
var deleteConfirmButton = document.getElementById("yes-delete");
var deleteCancelButton = document.getElementById("no-cancel");
var annotateSampleBtn = document.getElementById("annotate-sample-button");
var referenceElement;

var tracker = {};

            window.addEventListener("dragover", function(e){
                e = e || event;
                e.preventDefault();
            });
            window.addEventListener("drop", function(e){
                e = e || event;
                e.preventDefault(); 
            });

annotateSampleBtn.addEventListener("click", function(e){
	var pk = document.getElementById("pk-field").value;
	window.location.assign("/analysis/annotate-files/" + pk + "/")
});

function rm_upload(e){
            var index = e.target.index;
            delete tracker[index];
            console.log(tracker);
            var parent = e.target.parentNode;
            var grandParent = parent.parentNode;
            grandParent.removeChild(parent);
            currentUploadObjects -= 1;
            if (currentUploadObjects === 0){
                uploadButton.style.display = 'none';
            }
}

function trackFile(file){
    if(currentUploadObjects === 0){
	uploadButton.style.display = "block";
    }
    uploadCounter += 1;
    currentUploadObjects += 1;
    console.log('pretend to upload file');
    console.log(file);
    var new_p = document.createElement("p");
    new_p.className ="sample-display";
    var lhs = document.createElement("span");
    var rhs = document.createElement("span");
    lhs.textContent = file.name;
    rhs.textContent = "x";
    lhs.className = "lhs";
    rhs.className = "rhs";
    new_p.appendChild(lhs);
    new_p.appendChild(rhs);
    rhs.index = uploadCounter;
    tracker[uploadCounter] = file;
    uploadListDisplay.appendChild(new_p);
    rhs.addEventListener("click", rm_upload);
}

function traverseFiles(files){
    if (typeof files !== "undefined"){
        for(var i=0; i<files.length; i++){
            trackFile(files[i]);
        }
    }
    else{
        uploadListDisplay.innerHTML = "unsupported";
    }
}

filesUpload.addEventListener("change", function(){
    traverseFiles(this.files);
});

dropArea.addEventListener("dragenter", function(e){
    this.className = "over";
    e.preventDefault();
    e.stopPropagation();
});

dropArea.addEventListener("dragover", function(e){
    e.preventDefault();
    e.stopPropagation();
});

dropArea.addEventListener("drop", function(e){
    traverseFiles(e.dataTransfer.files);
    this.className = "";
    e.preventDefault();
    e.stopPropagation();
});

dropArea.addEventListener("dragleave", function(e){
    console.log('left area!');
    console.log(e.target);
    this.className = "";
    e.preventDefault();
    e.stopPropagation();
})

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
	console.log("change name!");
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


// below is code related to file upload

var progressSection = document.getElementById("upload-progress-section");
var progressMapping = {}

function createUploadProgressElement(file_index, name){
	var a = document.createElement("div");
	a.className = 'outer-bar';
	var b1 = document.createElement("span");
	var b2 = document.createElement("span");
	b2.className = "margin-left-ten";
	b1.textContent = name;
	b2.textContent = '0%';
	var c = document.createElement("div");
	c.className = 'inner-progress-bar';
	c.style.width = "1%";
	a.appendChild(b1);
	a.appendChild(b2);
	a.appendChild(c);
	progressSection.appendChild(a);
	progressMapping[file_index] = [b2,c];
};


function updateProgressElement(file_index, pct){
	progressMapping[file_index][0].textContent=pct.toString() + '%';
	progressMapping[file_index][1].style.width=pct.toString() + '%';
};

var doUploadButton = document.getElementById("upload-button");
doUploadButton.addEventListener("click", function(){
    var allFiles = [];
    for (var key in tracker){
        if(tracker.hasOwnProperty(key)){
            fileObj = tracker[key];
            allFiles.push(fileObj);
        }
    }
    var uploadDisplayContainer = document.getElementById("files-to-upload-display");
    var children = uploadDisplayContainer.children;
    var l = children.length;
    for(var i=0; i<l; i++){
        uploadDisplayContainer.removeChild(children[0]);
    }
    doUploadButton.style.display = 'none';
    currentUploadObjects = 0;
    tracker = {};
    uploadCounter = 0;
    handleMultipleFileUpload(allFiles);
});


function checkExistingForOverwrite(allFiles){
    // dirty check/reminder for file overwrite:
    var existingSamplesWrapper = document.getElementById("existing-samples-wrapper");
    var children = existingSamplesWrapper.querySelectorAll('.sample-display');
    var existingSampleNames = [];
    for(var i =0; i<children.length; i++){
        var rhs = children[i].querySelector('.rhs');
        existingSampleNames.push(rhs.getAttribute("filename"));
    }

}

function handleMultipleFileUpload(allFiles){
    var numFiles = allFiles.length;

    for (var i=0; i<numFiles; i++){
	ii = i+1; //for showing on the front-end
        file = allFiles[i];
	createUploadProgressElement(ii, file.name);
        getSignedRequest(file, ii);
    }
}


function getSignedRequest(file, file_index){
        // gets a signed URL from the server.  Server handles the keys, etc.
        var xhr = new XMLHttpRequest();
	var pk = document.getElementById("pk-field").value;
	xhr.open("POST", "/upload/sign-url/" + pk + '/');
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	var params = 'filename=' +file.name+'&filetype='+file.type;
	var csrftoken = getCookie('csrftoken');
	xhr.setRequestHeader("X-CSRFToken", csrftoken);
        xhr.onreadystatechange = function(){
                if(xhr.readyState === 4){
                        if(xhr.status === 200){
                                console.log('Returned from signedRequest');
                                var response = JSON.parse(xhr.responseText);
                                var signed_url = response.signed_url;
                                console.log(response);
                                console.log('Signed_url:'+signed_url);
                                initiateRequest(file, signed_url, file_index);
                        }
                        else{
                                alert("Could not get signed URL.");
                        }
                }
        };
        xhr.send(params);
}

function initiateRequest(file, signed_url, file_index){
        //make a POST request to get the resumable link
        var xhr = new XMLHttpRequest();
        xhr.open("POST", signed_url)
        xhr.setRequestHeader("Content-Type", 'text/plain');
        xhr.setRequestHeader("x-goog-resumable", 'start');
        xhr.onreadystatechange = function(){
                if(xhr.readyState === 4){
                        if(xhr.status === 201){
                                var resumable_url = xhr.getResponseHeader("location");
                                var baseStr = resumable_url.split("?")[0];
                                var qs = resumable_url.split("?")[1];
                                console.log(qs);
                                var queryDict = {};
                                qs.split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]});
                                console.log(queryDict);
                                resumable_url = baseStr + "?upload_id=" + queryDict['upload_id'] 
                                console.log('have resumable url: ' + resumable_url);
                                uploadFile(file, resumable_url, file_index);
                        }
                        else{
                                alert("Could not get POST to work");
                        }
                }
        };
        xhr.send();

}   



function uploadChunk(file, signed_url, i, start, end, size, BYTES_PER_CHUNK, file_index){
        var xhr = new XMLHttpRequest();
        xhr.open("PUT", signed_url, true);
        xhr.setRequestHeader('Content-Type', 'text/plain');
        var finish = end;
        var is_last_chunk = false;
        if(end >= size){
                finish=size-1;
                is_last_chunk = true;
        }
        var byteRange = 'bytes ' + start.toString() + '-' + finish.toString() + '/' + size;
        xhr.setRequestHeader('Content-Range', byteRange);
        xhr.onreadystatechange = function(e) {
                //console.log('Done loading chunk ' + i);
                if(xhr.readyState === 4){
                        if(xhr.status === 308){
                                //console.log('got 308. eresume');
                                var sent_range = xhr.getResponseHeader('range');
                                //console.log('from parsing range: ' + sent_range);
                                var final_byte_sent = parseInt(sent_range.split('-')[1]);
                                var pct = Math.round(100*(final_byte_sent/size));
				updateProgressElement(file_index, pct);
                                uploadChunk(file, signed_url, i+1, final_byte_sent, final_byte_sent+BYTES_PER_CHUNK, size, BYTES_PER_CHUNK, file_index);
                        }
                        else if(xhr.status === 200){
				updateProgressElement(file_index, 100);
                                console.log('Done!');
				updateProject(file, signed_url);
                        }
                        else{
                                console.log('Something else!' + xhr.status);
                        }
                }
        };
        xhr.send(file.slice(start,finish+1));
}

function uploadFile(file, signed_url, file_index){
        const BYTES_PER_CHUNK = 1* 1024 * 1024; // kB chunk sizes.
        const SIZE = file.size;
        var start = 0;
        var end = BYTES_PER_CHUNK;
        var chunk_num = 0
        uploadChunk(file, signed_url, 0, start, end, SIZE, BYTES_PER_CHUNK, file_index);
}


deleteConfirmButton.addEventListener("click", function(e){
	confirmationDialog.style.display = "none";
	document.getElementById("main-container").classList.remove("blur");
	performDeletion();	
});

deleteCancelButton.addEventListener("click", function(e){
	confirmationDialog.style.display = 'none';
	document.getElementById("main-container").classList.remove("blur");
});


function rm_file(e){
	console.log('file removal clicked!');
	confirmationDialog.style.display = "block";
	document.getElementById("main-container").classList.add("blur");
	var target = e.target;
	referenceElement = target;
}

function performDeletion(){
	var target = referenceElement;
	var attr = target.getAttribute("filename");
	if (attr !== undefined){
		console.log('remove '+attr);
		var parent =target.parentNode;
		var grandparent = parent.parentNode;
		grandparent.removeChild(parent);
		console.log(grandparent.hasChildNodes());
		console.log(grandparent.children.length);
		if(grandparent.children.length ===0){
			annotateSampleBtn.disabled = true;
		} 
		
	}
	//actually delete from database
        var xhr = new XMLHttpRequest();
        var pk = document.getElementById("pk-field").value;
        var csrftoken = getCookie('csrftoken');
        xhr.open("POST", "/analysis/delete-file/" + pk + "/");
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function(){
                if(xhr.readyState === 4){
                        if(xhr.status === 200){
				console.log('delete success');
                        }
                        else{
                                console.log("Problem with updating samples");
                        }
                }
        }
        xhr.send("filename=" + attr);
	
}
    
function updateProject(file, signed_url){
	console.log(file.name);
	console.log(signed_url);
	var xhr = new XMLHttpRequest();
	var pk = document.getElementById("pk-field").value;
        var csrftoken = getCookie('csrftoken');
	xhr.open("POST", "/analysis/update-files/" + pk + "/");
	xhr.setRequestHeader("X-CSRFToken", csrftoken);
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xhr.onreadystatechange = function(){
	        if(xhr.readyState === 4){
			if(xhr.status === 200){
			    var new_p = document.createElement("p");
			    new_p.className ="sample-display";
			    var lhs = document.createElement("span");
		    	var rhs = document.createElement("span");
		    	lhs.textContent = file.name;
		    	rhs.textContent = "x";
		    	lhs.className = "lhs";
		    	rhs.className = "rhs";
			rhs.setAttribute("filename",file.name);
		    	new_p.appendChild(lhs);
		    	new_p.appendChild(rhs);
			rhs.addEventListener("click", rm_file);
			    document.getElementById("existing-samples-wrapper").appendChild(new_p);
			annotateSampleBtn.disabled = false;
			}else if(xhr.status === 204){
				console.log("Sample already existed");
			}
			else{
				console.log("Problem with updating samples");
			}
		}
	}
	xhr.send("filename=" + file.name);
};

var sample_icons = document.querySelectorAll(".rhs");
for (var i = 0; i < sample_icons.length; i++) {
	console.log('ADD');
	sample_icons[i].addEventListener("click", rm_file);
}
