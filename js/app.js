/*
--- Info header ---
Print out the version for debugging purposes

*/
console.log("---------------");
console.log("Snibble v0.0.01");
console.log("---------------");


// Attempt to connect to the user passed in as the parameter
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


    // Fires when the connection opens
    newConnection.onopen = function(e) {
        console.log(e);
        console.log(newConnection);
    }; // end onopen()

    // Fires when the someone tries to join the room we're in
    newConnection.onNewSession = function(session) {
        console.log("OnNewSession() fired!");
        console.log(session);

        session.join();
    };

    // Fires when the connection recieves a message
    newConnection.onmessage = function(message) {
        console.log("onmessage() fired!");
        console.log(message);
    };

    // Fires when a new user asks to connect
    newConnection.onRequest = function (request) {
        console.log("onRequest() fired!");
        console.log(request);


        newConnection.accept(request);
    };

    // Fires every time the connection state changes
    newConnection.onstatechange  = function (state) {
        console.log("onstatechange() fired!");
        console.log(state);
    };

    // Set the session as data only
    newConnection.session = {
        data: true
    };

     // Set the current user's userID to their unique userID
    newConnection.userid = currentUserID;

    return newConnection;
} // end Connection()

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
        currentUserConnections[newConIndex].onconnected = function(event) {
            console.log("onconnected() fired");
            console.log(event);

            toastr.success("Connected to " + event.userid);
        };
        currentUserConnections[newConIndex].connect();
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
    };

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
    };

    //
    newUserConnection.onstreamended = function(e) {
        console.log(e);

        // Remove relevant stream
        e.mediaElement.parentNode.removeChild(e.mediaElement);
    };

    //
    newUserConnection.onmessage = function(message) {
        console.log(message);

        // Add the chat message to the output box
        var chatOutput = document.getElementById("text-chat-output");
        chatOutput.innerHTML += message.userid + ": " + (message.data).replace(/[<>]/g, '') + "<br>";

        // Scroll to bottom of textbox
        chatOutput.scrollTop = chatOutput.scrollHeight;
    };

    //
    newUserConnection.onunmute = function(event) {
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
    };

    // Fired when someone has connected to us
    newUserConnection.onconnected = function(event) {
      console.log("onconnected() event fired");
      console.log(event);

      // If the user that fired the event isn't in our list of connected users,
      //  add them to the array and display a notification!
      if(newUserConnection.connctedUsers.indexOf(event.userid) == -1) {
            var newIndex = newUserConnection.connctedUsers.length;
            newUserConnection.connctedUsers[newIndex] = event.userid;

            toastr.success("Connected to " + event.userid);
      } // end if
   };


    // Array holding the users that we're connected to
    newUserConnection.connctedUsers = [];

    return newUserConnection;
} // end CreateUserConnection()


document.getElementById("start-video").onclick = function() {
    var videoButton = document.getElementById("start-video");

    if(videoButton.value == "Attach Video Stream") {
        currentUserConnections[0].addStream({
            video: true,
            audio: true
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
    var userIDInput = document.getElementById('userID-input');
    var userIDToConnect = userIDInput.value;

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
    userIDInput.value = "";

    console.log("Attempting to connect with " + userIDToConnect);
    ConnectToUser(userIDToConnect);
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
