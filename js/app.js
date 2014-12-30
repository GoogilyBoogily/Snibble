/*
--- Info Header ---


*/

// Print out the version for debugging purposes
console.log("---------------");
console.log("Snibble v0.0.01");
console.log("---------------");



/*
//--- Auto Redial ---

 connection.autoReDialOnFailure = true;

//--- Logs ---
http://www.rtcmulticonnection.org/docs/skipRTCMultiConnectionLogs/
---
// You can disable all logs by setting "window.skipRTCMultiConnectionLogs" to true.
// Remember, it is "window" level object
window.skipRTCMultiConnectionLogs = true;
---
http://www.rtcmulticonnection.org/docs/#log
---
// if you want to disable logs
connection.log = false;

connection.onlog = function(log) {
    var div = document.createElement('div');
    div.innerHTML = JSON.stringify(log, null, '
');
    document.documentElement.appendChild(div);
};

//--- Token (Random string) ---
http://www.rtcmulticonnection.org/docs/token/
---
var randomString = rtcMultiConnection.token();
rtcMultiConnection.userid = rtcMultiConnection.token();

//--- ICE Protocols
http://www.rtcmulticonnection.org/docs/#iceProtocols
---
connection.iceProtocols = {
    tcp: true, // prefer using TCP-candidates
    udp: true  // prefer using UDP-candidates
};

//--- Process SDP ---
http://www.rtcmulticonnection.org/docs/processSdp/
---
// "processSdp" method can be used to modify SDP yourself!
//   You can modify SDP to remove vp8 codecs on Firefox so that H264 are used.
//   You can even modify SDP for application-level bandwidth and many other SDP-attributes. 
connection.processSdp = function(sdp) {
    sdp = remove_vp8_codecs(sdp);
    sdp = prefer_opus (sdp);
    sdp = use_maxaveragebitrate(sdp);
    return sdp;
};

//--- SDP Constraints ---
http://www.rtcmulticonnection.org/docs/sdpConstraints/
---
connection.sdpConstraints.mandatory = {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: true,
    VoiceActivityDetection: true,
    IceRestart: true
};

//--- User Media stuff ---
http://www.rtcmulticonnection.org/docs/dontCaptureUserMedia/
---
// ask RTCMultiConnection to don't auto-capture any media
// added since v1.9
connection.dontCaptureUserMedia = true;

---
http://www.rtcmulticonnection.org/docs/dontAttachStream/
---
// ask RTCMultiConnection to don't attach any stream to peer connection
// it means that RTCMultiConnection will NEVER use "peer.addStream"
// for any local media stream. So you'll be joining with no stream.
// Remember, v1.8 and earlier versions prevents capturing of user media for this boolean
connection.dontAttachStream = true;

---
http://www.rtcmulticonnection.org/docs/#captureUserMediaOnDemand
---
// it is "disabled" by default
// captureUserMediaOnDemand means that "getUserMedia" API for initiator will 
// be invoked only when required.
// i.e. when first participant is detected.

// you can enable it by setting it to "true"
connection.open({
    captureUserMediaOnDemand: true
});

---
http://www.rtcmulticonnection.org/docs/captureUserMedia/
---
// You can use captureUserMedia to manually capture media streams.
// It accepts two arguments; first one is mandatory and last one is optional:
//   1. success-callback: which is called on successfully getting user media resources.
//   2. session: which allows you force custom media type to be captured.
var session = {
    audio: true
};

connection.captureUserMedia(function (mediaStream) { }, session);

*/



// ----------------------------------------------------------
// Attempt to connect to the user passed in as the parameter
// ----------------------------------------------------------
function ConnectToUser(userIDToConnectTo) {
	var generatedChannelID = GenerateRandomString(12);

	// Add a new connection onto the current user's connection array
	var newConIndex = currentUserConnections.length;

	// Create new connection with the randomly generated channel ID
	currentUserConnections[newConIndex] = CreateUserConnection(generatedChannelID);

	// Open the connection
	currentUserConnections[newConIndex].open();

	// Connect to the user and tell them what room to join
	currentUserConnections[newConIndex + 1] = CreateIntermediateConnection(userIDToConnectTo, generatedChannelID);
	// Go and connect to the user!
	currentUserConnections[newConIndex + 1].connect(userIDToConnectTo);


	console.log("Opened connection to new room");
	console.log(currentUserConnections[newConIndex + 1]);
} // end ConnectToUser()

// ----------------------------------------------
// Attempt to add a user to the given connection
// ----------------------------------------------
function AddUserToConnection(connectionToAddUser, userIDToAdd) {
	var channelID = connectionToAddUser.channel;

	// Add a new connection onto the current user's connection array
	var newConIndex = currentUserConnections.length;

	// Connect to the user and tell them what room to join
	currentUserConnections[newConIndex] = CreateIntermediateConnection(userIDToAdd, channelID);
	// Go and connect to the user!
	currentUserConnections[newConIndex].connect(userIDToAdd);


	console.log("Went and send off the request to add the user!");
	console.log(currentUserConnections[newConIndex]);
} // end AddUserToConnection()

// -------------------------------------------------
// Create a general connection object and return it
// -------------------------------------------------
function CreateDefaultConnection() {
	// Create a new RTCMultiConnection
	var newConnection = new RTCMultiConnection();

	// Create the list for public STUN servers
	var iceServers = [{
			url: 'stun:stun.l.google.com:19302'
					  },
		{
			url: 'stun:stun1.l.google.com:19302'
					  },
		{
			url: 'stun:stun2.l.google.com:19302'
					  },
		{
			url: 'stun:stun3.l.google.com:19302'
					  },
		{
			url: 'stun:stun4.l.google.com:19302'
					  }];

	// Set the ICE servers!
	newConnection.iceServers = iceServers;

	// -----------------
	// Signalling stuff
	// -----------------
	var channels = {};
	var firebase = new Firebase("https://webrtcantiskype.firebaseio.com");

	firebase.on("child_added", function(snapshot) {
		var data = snapshot.val();

		if (data.sender == newConnection.userid) return;

		if (channels[data.channel]) {
			channels[data.channel](data.message);
		};

		snapshot.ref().remove();
	});

	// Overriding "openSignalingChannel" method
	newConnection.openSignalingChannel = function(config) {
		var channel = config.channel || this.channel;
		channels[channel] = config.onmessage;

		if (config.onopen) setTimeout(config.onopen, 1000);

		return {
			send: function(message) {
				firebase.push({
					sender: newConnection.userid,
					channel: channel,
					message: message
				});
			},
			channel: channel
		};
	};
	// ---------------------
	// end Signalling stuff
	// ---------------------


	// Fires each time when data connection gets open
	newConnection.onopen = function(e) {
		console.log("onopen() fired!");
		console.log(e);
	}; // end onopen()

	// Fires when the someone tries to join the room we're in
	newConnection.onNewSession = function(session) {
		console.log("OnNewSession() fired!");
		console.log(session);

		newConnection.join(session);
	}; // end onNewSession()

	// Fires when the connection recieves a message
	newConnection.onmessage = function(message) {
		console.log("onmessage() fired!");
		console.log(message);
	}; // end onmessage()

	// Fires when a new user asks to connect
	newConnection.onRequest = function (request) {
		console.log("onRequest() fired!");
		console.log(request);

		newConnection.accept(request);
	}; // end onRequest()

	// Fires every time the connection state changes
	newConnection.onstatechange  = function (state) {
		console.log("onstatechange() fired!");
		console.log(state);
	};

	// Fired when someone has connected to us
	newConnection.onconnected = function(event) {
		console.log("onconnected() fired!");
		console.log(event);
	}; // end onconnected()

	newConnection.onMediaError = function (error) {
		console.log("onMediaError() fired!");
    	console.error(error);
	}; // end onMediaError

	// Set the session as data only
	newConnection.session = {
		data: true,
	};


	 // Set the current user's userID to their unique userID
	newConnection.userid = currentUserID;

	return newConnection;
} // end CreateDefaultConnection()

// ----------------------------------------------------------------------------------------
// Create a default connection and modify it so it functions as the user's home connection
// ----------------------------------------------------------------------------------------
function CreateHomeConnection() {
	var newHomeConnection = CreateDefaultConnection();

	// Modify the channel to the user's current ID
	newHomeConnection.channel = currentUserID;

	// Modify the session name to the user's current ID
	newHomeConnection.sessionid = currentUserID;

	// Fired when a new user asks to connect to us
	newHomeConnection.onRequest = function (request) {
		console.log("onRequest() fired!");
		console.log(request);


		// TODO: Make this a choice.
		// Instead of accepting the request, reject it, grab the extra data from it, and join that room
		newHomeConnection.reject(request);
		//newConnection.accept(request);

		// Create the connection for the channel to actually do stuff in
		var newConIndex = currentUserConnections.length;


		// TODO: THIS PART
		currentUserConnections[newConIndex] = CreateUserConnection(request.extra);

		// Fires each time when data connection gets open
		currentUserConnections[newConIndex].onopen = function(event) {
			console.log("onopen() fired!");
			console.log(event);

			// If the user that fired the event isn't in our list of connected users,
			//  add them to the array and display a notification!
			if(currentUserConnections[newConIndex].connctedUsers.indexOf(event.userid) == -1) {
				var newIndex = currentUserConnections[newConIndex].connctedUsers.length;
				currentUserConnections[newConIndex].connctedUsers[newIndex] = event.userid;

				toastr.success("Connected to " + event.userid);
			} // end if
		}; // end onopen()

		
		currentUserConnections[newConIndex].connect(request.extra);
	}; // end onRequest()

	// Open the connection
	newHomeConnection.open();

	return newHomeConnection;
} // end CreateHomeConnection()


// -----------------------------------------------------------------------------------------
// Create a connection and connect to the home connection of the user we want to connect to
// and invite them to a connection that we're going to make ourselves
// -----------------------------------------------------------------------------------------
function CreateIntermediateConnection(userIDToConnectTo, generatedChannelID) {
	var newIntermediateConnection = CreateDefaultConnection();

	// Modify the channel to the user's ID we want to connect to
	newIntermediateConnection.channel = userIDToConnectTo;

	// Modify the session name to the user's ID we want to connect to
	newIntermediateConnection.sessionid = userIDToConnectTo;

	// Used to tell the user what room they should connect to!
	newIntermediateConnection.extra = generatedChannelID;

	// Fired whenever the connection's state changes
	newIntermediateConnection.onstatechange = function(state) {
		console.log("onstatechange() fired!");
		console.log(state);

		if(state.name == "request-rejected") {
			console.log("Popping intermediate connection off the connection array.");
			currentUserConnections.pop();
		} // end if
	}; // end onstatechange()

	return newIntermediateConnection;
} // end CreateIntermediateConnection()


// -------------------------------------------------------------------
// Create a new connection for actually interacting with another user
// -------------------------------------------------------------------
function CreateUserConnection(generatedChannelID) {
	var newUserConnection = CreateDefaultConnection();

	// Modify the channel to the generated name
	newUserConnection.channel = generatedChannelID;

	// Modify the session ID to the generated name
	newUserConnection.sessionid = generatedChannelID;

	// On getting local or remote media stream
	newUserConnection.onstream = function(e) {
		console.log("onstream() fired!");
		console.log(e);

		// Set the stream ID to correspond with if its local or remote
		if(e.type == "local") {
			var localVideoStream  = e.mediaElement;
			localVideoStream.autoplay = true;
			localVideoStream.controls = false;
			localVideoStream.id = "local-video";

			document.getElementById("media-container").appendChild(localVideoStream);
		} else {
			var remoteVideoStream =  e.mediaElement;
			remoteVideoStream.autoplay = true;
			remoteVideoStream.controls = false;
			remoteVideoStream.id = "remote-video";

			document.getElementById("media-container").appendChild(remoteVideoStream);
		} // end if/else
	}; // end onstream()

	//
	newUserConnection.onstreamended = function(e) {
		console.log("onstreamended() fired!")
		console.log(e);

		// Remove relevant stream
		e.mediaElement.parentNode.removeChild(e.mediaElement);
	}; // onstreamended()

	//
	newUserConnection.onmessage = function(message) {
		console.log("onmessage() fired!");
		console.log(message);

		// Add the chat message to the output box
		var chatOutput = document.getElementById("text-chat-output");
		chatOutput.innerHTML += message.userid + ": " + (message.data).replace(/[<>]/g, '') + "<br>";

		// Scroll to bottom of textbox
		chatOutput.scrollTop = chatOutput.scrollHeight;
	}; // end onmessage()

	//
	newUserConnection.onunmute = function(event) {
		console.log("onmute() fired!");
		console.log(event);
		// event.isAudio == audio-only-stream
		// event.audio == has audio tracks

		// If it is audio being muted
		if (event.isAudio || event.session.audio) {
			// set volume=0
			event.mediaElement.volume = 0;

			// steadily increase volume
			afterEach(200, 5, function() {
				event.mediaElement.volume += .20;
			});
		} // end if
	}; // end onmute()

	// Fires each time when data connection gets open
	newUserConnection.onopen = function(event) {
		console.log("onopen() fired!");
		console.log(event);

		// If the user that fired the event isn't in our list of connected users,
		//  add them to the array and display a notification!
		if(newUserConnection.connctedUsers.indexOf(event.userid) == -1) {
			var newIndex = newUserConnection.connctedUsers.length;
			newUserConnection.connctedUsers[newIndex] = event.userid;

			toastr.success("Connected to " + event.userid);
		} // end if
	}; // end onopen()

	newUserConnection.onstreamid = function(event) {
		console.log("onstreamid() fired!");
		console.log(event);
	}; // end onstreamid()

	// Array holding the users that we're connected to
	newUserConnection.connctedUsers = [];



	newUserConnection.session = {
	    inactive: true,
	    audio:    true,
	    video:    true
	};

	return newUserConnection;
} // end CreateUserConnection()


document.getElementById("start-video").onclick = function() {
	var videoButton = document.getElementById("start-video");

	if(videoButton.value == "Attach Video Stream") {
		currentUserConnections[0].addStream({
			video: true,
			audio: true,
			oneway: true
		});

		videoButton.value = "Detach Video Stream";
	} else {
		currentUserConnections[0].removeStream({
			video: true,
			audio: true
		});

		videoButton.value = "Attach Video Stream";
	} // end else/if
};

document.getElementById("start-audio").onclick = function() {
	var videoButton = document.getElementById("start-audio");

	if(videoButton.value == "Attach Audio Stream") {
		currentUserConnections[0].addStream({
			audio: true
		});

		videoButton.value = "Detach Audio Stream";
	} else {
		currentUserConnections[0].removeStream({
			audio: true
		});

		videoButton.value = "Attach Audio Stream";
	} // end else/if
};


// Text chat input onkeydown event
document.getElementById("text-chat-input").onkeydown = function(e) {
	// If the enter key is pressed
	if((e.keyCode || e.charCode) === 13) {
		// Get the input text
		var chatInputBox = document.getElementById("text-chat-input");

		// Send the chat message
		currentUserConnections[0].send(chatInputBox.value);

		// Add the chat message to the output box
		var chatOutput = document.getElementById("text-chat-output");
		chatOutput.innerHTML += "You: " + (chatInputBox.value).replace(/[<>]/g, "") + "<br>";

		// Scroll to bottom of textbox
		chatOutput.scrollTop = chatOutput.scrollHeight;

		// Reset the chat input box
		chatInputBox.value = "";
	} // end if
};

// Connect to another user on button click!
document.getElementById("connect-to-user").onclick = function() {
	var userIDConnectInput = document.getElementById('userID-connect-input');
	var userIDToConnect = userIDConnectInput.value;

	if(userIDToConnect !== undefined) {
		userIDToConnect = userIDToConnect.trim();
	} else {
		userIDToConnect = "";
	} // end if/else

	// If nothing is entered into the input box, do nothing
	if(userIDToConnect == "") {
		return;
	} // end if

	// Reset the input box to empty
	userIDConnectInput.value = "";

	console.log("Attempting to connect with " + userIDToConnect);
	// Go and connect!
	ConnectToUser(userIDToConnect);
}; // end onclick

document.getElementById("add-user").onclick = function() {
	var userIDAddInput = document.getElementById('userID-add-input');
	var userIDToAdd = userIDAddInput.value;

	if(userIDToAdd !== undefined) {
		userIDToAdd = userIDToAdd.trim();
	} else {
		userIDToAdd = "";
	} // end if/else

	// If nothing is entered into the input box, do nothing
	if(userIDToAdd == "") {
		return;
	} // end if

	// Reset the input box to empty
	userIDAddInput.value = "";

	console.log("Attempting to add " + userIDToAdd);
	// Go and add the user to the connection!
	// TODO: Change from hardcoded first connection to a dynamic one
	AddUserToConnection(currentUserConnections[0], userIDToAdd);
}; // end onclick


//
// Begin actually running
//

// Init current user ID var
var currentUserID;

// Check for localstorage support!
if(typeof (Storage) !== undefined) {
	// TODO: Uncomment this when we're not debugging
	/*
	// Attempt to get the locally stored currentUserID
	var storedCurrentUserID = localStorage.getItem("currentUserID");
	// If storedCurrentUserID isn't null, set currentUserID to its value
	//   Else generate and store a currentUserID
	if (storedCurrentUserID !== null) {
		// Snag the currentUserID from the stored version
		currentUserID = storedCurrentUserID;
		console.log("Current userID is: " + currentUserID);
	} else {
		// Generate the new userID
		currentUserID = GenerateUserID();
		console.log("Current userID is: " + currentUserID);
		// Store the newly generated userID in localstorage
		localStorage.setItem("currentUserID", currentUserID);
	} // end if/else
	*/

	// Generate the new userID
	currentUserID = GenerateRandomString(6);
	console.log("Current userID is: " + currentUserID);


	// Place the currentUserID into the title bar so the user knows who they are
	document.getElementById('userID').innerHTML += currentUserID;

} else {
	console.log("No localstorage support... :(");
	console.log("Basically nothing is going to work. Good luck.");
} // end if/else

// Create the current user's home connection
var homeConnection = CreateHomeConnection();
console.log("Home Connection:");
console.log(homeConnection);


// Make an array for all of current user's connections
var currentUserConnections = [];
