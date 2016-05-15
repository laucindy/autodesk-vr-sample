var accessToken;
var fileContents = null;
var viewerLeft, viewerRight;
var adjustRightCamera = true;
var adjustLeftCamera = true;
var baseURL = "https://developer.api.autodesk.com/";

function loadViewer(encodedURN) {
		
   var options = {
      'document' : 'urn:' + encodedURN,
      'env':'AutodeskProduction',
      'getAccessToken': getToken,
      'refreshToken': getToken,
   };
   viewerLeft = new Autodesk.Viewing.Viewer3D($("#viewerLeft")[0], {});
   viewerRight = new Autodesk.Viewing.Viewer3D($("#viewerRight")[0], {});
   Autodesk.Viewing.Initializer(options,
      function() {
         viewerLeft.initialize();
		 viewerRight.initialize();
         loadDocument(viewerLeft, viewerRight, options.document);
      }
   );
}

// This method returns a valid access token  For the Quick Start we are just returning the access token
// we obtained in step 2.  In the real world, you would never do this.
function getToken() {
	var clientID = "0ImaA07tA5Y0t0xIP6lp0zUXmAWS3EZv";
	var clientSecret = "aB94QD5d9Ao8ERVu";		// hard-coded for now
	$.get("https://auth-server-sample.herokuapp.com/auth", function(data) {
		console.log(data)
	})
	  .done(function( msg ) {
		console.log("Successfully posted request for access token")
		console.log(msg)
		accessToken = msg.access_token;
	  })
	  
	  .fail(function(xhr, textStatus) {
		  alert("Could not get access token: " + textStatus);
		  console.log("Could not get access token: ");
			console.log(xhr)
		  console.log(textStatus);
	  });
	  
	  return accessToken;
}

function loadDocument(viewerLeft, viewerRight, urn) {
   // Find the first 3d geometry and load that.
   Autodesk.Viewing.Document.load(
      urn,
      function(doc) {// onLoadCallback
         var geometryItems = [];
         geometryItems = Autodesk.Viewing.Document.getSubItemsWithProperties(doc.getRootItem(), {
             'type' : 'geometry',
             'role' : '3d'
         }, true);
         if (geometryItems.length > 0) {
           //  viewer.load(doc.getViewablePath(geometryItems[0]));
			 viewerLeft.load(doc.getViewablePath(geometryItems[0]));
			 viewerRight.load(doc.getViewablePath(geometryItems[0]));
			 
         }
		 watchCameras();
		 console.log("END")
      },
      function(errorMsg) {// onErrorCallback
         alert("Load Error: " + errorMsg);
		 console.log(errorMsg);
      }
   );
}

function watchCameras() {
	console.log("viewers left and right:")
	console.log(viewerLeft)
	console.log(viewerRight);
	
	viewerLeft.addEventListener('cameraChanged', left2Right);			// adjust right camera
	viewerRight.addEventListener('cameraChanged', right2Left);			// adjust left camera
}

function left2Right() {
	if (adjustRightCamera) {				// user is moving left view
	adjustLeftCamera = false;
	
	transferCameras(true);
	console.log("LEFT CAMERA MOVING");
	
	setTimeout(function() { adjustLeftCamera = true; }, 500);
	}
}

function right2Left() {
	if (adjustLeftCamera) {				// user is moving right view
	adjustRightCamera = false;
	
    transferCameras(false);
	console.log("RIGHT CAMERA MOVING");
	
	setTimeout(function() { adjustRightCamera = true; }, 500);
	}
}


function transferCameras(leftToRight) {
    // The direction argument dictates the source and target
    var source = leftToRight ? viewerLeft : viewerRight;
    var target = leftToRight ? viewerRight : viewerLeft;
	
    var pos = source.navigation.getPosition();
    var trg = source.navigation.getTarget();

    // Get the new position for the target camera
    var up = source.navigation.getCameraUpVector();

	
    // Get the position of the target camera
    var newPos = offsetCameraPosition(source, pos, trg, leftToRight);
	
	zoom(target, newPos, trg, up);

}

function offsetCameraPosition(source, position, target, leftToRight) {
	var display = position.distanceTo(target) * 0.04;
	
	var clone = source.autocamCamera.clone();
	clone.translateX(leftToRight ? display: -display);
	return clone.position;
}

function zoom(viewer, pos, trg, up) {
    // Make sure our up vector is correct for this model
    viewer.navigation.setView(pos, trg);
    viewer.navigation.setCameraUpVector(up);
}

function upload() {
	//deleteURN("dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6c2FtcGxlLWJ1Y2tldC9Sb2JvdEFybS5kd2Z4")
	//deleteURN("dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6c2FtcGxlLWJ1Y2tldC8xNDAzLmR3Zng=")
	$("#openFile").click();
	return false;
}

function loadFile() {
	getFileContent();
}

function uploadToBucket(fileName) {
	console.log("START UPLOAD")
	
	accessToken = getToken();
	
	var fileName = $(":file").val();
	
	$.ajax({
	  type: "PUT",
	  headers: {
		"Authorization": "Bearer " + accessToken,
		"Content-Type": 'application/stream'
		},
	  url: "https://developer.api.autodesk.com/oss/v2/buckets/sample-bucket/objects/" + fileName,
	  data: fileContents,
	  processData: false
	})
	  .done(function( msg ) {
		console.log("Successfully uploaded to bucket")
		var encodedURN = Base64.encode(msg.objectId);
		console.log(encodedURN);
		translateFile(encodedURN);
		loadViewer(encodedURN);
	  })
	  
	  .fail(function(xhr, textStatus) {
		  alert("Request Failed: " + textStatus);
		  console.log("Request failed: ");
			console.log(xhr)
		  console.log(textStatus);
	  });
}

function getFileContent() {
	console.log("getting file contents")
	var reader = new FileReader();
	reader.onload = loaded;

	
	var file = document.getElementById("openFile").files[0];
	//reader.readAsText(file, "UTF-8");
	
	var blob = file.slice(0, file.size);
	var content = reader.readAsArrayBuffer(blob);
	console.log(blob)
		
}

function loaded(event) {
	var fileContent = event.target.result;
	console.log("testing load function, result is: ")
	console.log(event)
	
	fileContents = event.target.result;
	
	uploadToBucket();
}


function translateFile(encodedURN) {
    $.ajax({
            url: "https://developer.api.autodesk.com/viewingservice/v1/register",
            method: 'POST',
            headers: {
                "Authorization": "Bearer " + accessToken
            },
            data: JSON.stringify({urn: encodedURN }),
            contentType: 'application/json',
        })
        .done(function(data) {
           console.log("Successfully translated file")
        })
        .fail(function(xhr, textStatus) {
            alert("Failed to translate file: " + textStatus)
			console.log(xhr);
        });
}

function deleteURN(encodedURN) {
	$.ajax({
	  method: "DELETE",
	  headers: {
		"Authorization": "Bearer " + accessToken,
		"Content-Type": 'application/stream'
		},
	  url: "https://developer.api.autodesk.com/viewingservice/v1/" + encodedURN,
	  data: fileContents,
	  processData: false
	})
	  .done(function( msg ) {
		console.log("Successfully deleted")
	  })
	  
	  .fail(function(xhr, textStatus) {
		  alert("Could not Delete: " + textStatus);
		  console.log("Could not delete: ");
			console.log(xhr)
		  console.log(textStatus);
	  });
}