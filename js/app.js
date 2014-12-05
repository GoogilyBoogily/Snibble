// Attempt to connect to the user passed in as the parameter
function ConnectToUser(userIDToConnectTo) {
    var randomChannelID = GenerateRandomString(12);

    // Add a new connection onto the current user's connection array
    var newConIndex = currentUserConnections.length;

    // Create new connection with the randomly generated channel ID
    currentUserConnections[newConIndex] = CreateNewConnection(randomChannelID);
    // Fired when someone has connected to us
    currentUserConnections[newConIndex].onconnected = function(event) {
        console.log("onconnected() event fired");
        console.log(event);

        toastr.success("Connected to " + event.userid);
    };
    // Open and capture user media when another user connects
    currentUserConnections[newConIndex].open(captureUserMediaOnDemand = true);

    // TODO: Remove this connection when we don't need it anymore
    // Connect to the user and tell them what room to join
    currentUserConnections[newConIndex + 1] = CreateNewConnection(userIDToConnectTo);
    // Used to tell the user what room they should connect to!
    currentUserConnections[newConIndex + 1].extra = randomChannelID;
    currentUserConnections[newConIndex + 1].connect(userIDToConnectTo);


    console.log("Opened connection to new room");
    console.log(currentUserConnections[newConIndex + 1]);
} // end ConnectToUser()

// Create and return the current user's home connection
function CreateHomeConnection() {
    var newConnection = new RTCMultiConnection(currentUserID);

    // Set the current user's userID to their unique userID
    newConnection.userid = currentUserID;

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
    // Set ICE servers!
    newConnection.iceServers = iceServers;

    // When the new connection opens
    newConnection.onopen = function(e) {
        // e.userid
        // e.extra

        console.log(e);
        console.log(newConnection);
    } // end onopen()

    //
    // Signalling stuff
    //
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

    newConnection.onNewSession = function(session) {
        // session.userid
        // session.sessionid
        // session.extra
        // session.session i.e. {audio,video,screen,data}
        console.log("OnNewSession() fired!");
        console.log(session);

        session.join();
    };

    newConnection.onmessage = function(message) {

    };

    // Fired when a new user asks to connect to us
    newConnection.onRequest = function (request) {
        console.log(request);

        // Accept the newly got request
        //newConnection.accept(request);

        // TODO: Make this a choice.
        // Instead of accepting the request, reject it, grab the extra data from it, and join that room
        newConnection.reject(request);

        // Create the connection for the channel to actually do stuff in
        var newConIndex = currentUserConnections.length;

        currentUserConnections[newConIndex] = CreateNewConnection(request.extra);
        currentUserConnections[newConIndex].onconnected = function(event) {
            console.log("onconnected() fired");
            console.log(event);

            toastr.success("Connected to " + event.userid);
        };
        currentUserConnections[newConIndex].connect();
    };

    newConnection.onstatechange  = function (state) {
        // state.userid == 'target-userid' || 'browser'
        // state.extra  == 'target-user-extra-data' || {}
        // state.name  == 'short name'
        // state.reason == 'longer description'
        console.log("onstatechange() fired!");
        console.log(state);
    };

    newConnection.session = {
        data: true
    };

    newConnection.userid = currentUserID;

    // Open and capture user media when another user connects
    newConnection.open(captureUserMediaOnDemand = true);

    return newConnection;
} // end CreateHomeConnection()

// Function for creating new connections
// Create and return a connection for connecting to someone else's local connection
function CreateNewConnection(connectingToUserID) {
    var newConnection = new RTCMultiConnection(connectingToUserID);

    // Set the current user's userID to their unique userID
    newConnection.userid = currentUserID;

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
    // Set ICE servers!
    newConnection.iceServers = iceServers;

    //
    // Signalling stuff
    //
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

    newConnection.onNewSession = function(session) {
        // session.userid
        // session.sessionid
        // session.extra
        // session.session i.e. {audio,video,screen,data}
        console.log("OnNewSession() fired!");
        console.log(session);

        session.join();
    };

    // When the new connection opens
    newConnection.onopen = function(e) {

    } // end onopen()


    // On getting local or remote media stream
    newConnection.onstream = function(e) {
        console.log(e);

        //
        if(e.type == "local") {
            var localVideoStream  = e.mediaElement;
            localVideoStream.autoplay = true;
            localVideoStream.id = "local-video";

            document.getElementById("media-container").appendChild(localVideoStream);
        } else {
            var remoteVideoStream =  e.mediaElement;
            remoteVideoStream.autoplay = true;
            remoteVideoStream.id = "remote-video";

            document.getElementById("media-container").appendChild(remoteVideoStream);
        } // end if/else
    };

    newConnection.onstreamended = function(e) {
        console.log(e);

        // Remove relevant stream
        e.mediaElement.parentNode.removeChild(e.mediaElement);
    };

    newConnection.onmessage = function(message) {
        console.log(message);

        // Add the chat message to the output box
        var chatOutput = document.getElementById("text-chat-output");
        chatOutput.innerHTML += message.userid + ": " + (message.data).replace(/[<>]/g, '') + "<br>";

        // Scroll to bottom of textbox
        chatOutput.scrollTop = chatOutput.scrollHeight;
    };

    newConnection.session = {
        data: true
    };

    newConnection.onunmute = function(event) {
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

    newConnection.onstatechange  = function (state) {
        // state.userid == 'target-userid' || 'browser'
        // state.extra  == 'target-user-extra-data' || {}
        // state.name  == 'short name'
        // state.reason == 'longer description'
        console.log("onstatechange() fired!");
        console.log(state);
    };

    return newConnection;
} // end CreateNewConnection()


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
