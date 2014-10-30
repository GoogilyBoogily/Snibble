function GetDateTime() {
    var now     = new Date();
    var year    = now.getFullYear();
    var month   = now.getMonth()+1;
    var day     = now.getDate();
    var hour    = now.getHours();
    var minute  = now.getMinutes();
    var second  = now.getSeconds();

    if(month.toString().length == 1) {
        var month = '0' + month;
    } // end if
    if(day.toString().length == 1) {
        var day = '0' + day;
    } // end if
    if(hour.toString().length == 1) {
        var hour = '0' + hour;
    } // end if
    if(minute.toString().length == 1) {
        var minute = '0' + minute;
    } // end if
    if(second.toString().length == 1) {
        var second = '0' + second;
    } // end if
    var dateTime = hour + ':' + minute + ':' + second + ' ' + month + '/' + day + '/' + year;
    return dateTime;
} // end GetDateTime()

// Function for generating new userIDs
function GenerateUserID() {
    var text = "";
    var charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    // TODO: Maybe? Add in checking for if the userID we want to generate is already taken

    for(var i = 0; i < 24; i++) {
        text += charSet.charAt(Math.floor(Math.random() * charSet.length));
    } // end for

    return text;
} // end GenerateUserID()

// Generate and return a room name based on the userIDs
function GenerateRoomName(localID, remoteID) {
    var roomName = "";

    // Just concat the userIDs together...
    roomName = localID + remoteID;

    return roomName;
} // end GenerateRoomName()

// Checking if the user is already connected to the user passed in as the parameter
function IsCurrentlyConnected(userIDToConnectTo) {
    for (var i = 0; i < currentUserConnections.length; i++) {
        if (typeof currentUserConnections[i].channel == userIDToConnectTo) {
            return {"connected": true, "index": i};
        } // end if
    } // end for
    return {"connected": false, "index": -1};
} // end IsCurrentlyConnected()

// Attempt to connect to the user passed in as the parameter
function ConnectToUser(userIDToConnectTo) {
    // Check if we're already connected to the user we want to connect to
    if (!IsCurrentlyConnected(userIDToConnectTo).connected) {
        // Add a new connection onto the current user's connection array
        var newConIndex = currentUserConnections.length;

        // TODO: Remove this connection after we are sure the user we're trying to connect to enters the other channel
        currentUserConnections[newConIndex] = CreateNewConnection(userIDToConnectTo, true);
        currentUserConnections[newConIndex].connect(userIDToConnectTo);


        // Create the connection for the actual room
        var newConIndex = currentUserConnections.length;

        currentUserConnections[newConIndex] = CreateNewConnection(GenerateRoomName(currentUserID, userIDToConnectTo), false);
        currentUserConnections[newConIndex].open();


        console.log("Opened connection to new room");
        console.log(currentUserConnections[newConIndex]);
    } else {
        // Already connected to the user we want to connect to

    } // end if/else
} // end ConnectToUser()


// Handle how to get streams


// same code can be used for participants
// (it is optional)
/*
moderator.onstreamid = function(event) {
    // got a clue of incoming remote stream
    // didn't get remote stream yet

    var incoming_stream_id = event.streamid;

    YOUR_PREVIEW_IMAGE.show();

    // or
    YOUR_PREVIEW_VIDEO.show();
};

// same code can be used for participants
// it is useful
moderator.onstream = function(event) {
    // got local or remote stream
    // if(event.type == 'local')  {}
    // if(event.type == 'remote') {}

    document.body.appendChild(event.mediaElement);

    // or YOUR_VIDEO.src = event.blobURL;
    // or YOUR_VIDEO.src = URL.createObjectURL(event.stream);
};

// same code can be used for participants
// it is useful but optional
moderator.onstreamended = function(event) {
    event.mediaElement.parentNode.removeChild(event.mediaElement);
};
*/

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
    // Set STUN servers!
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
        console.log("OnNewSession fired!");
        console.log(session);

        session.join();
    };

    newConnection.onmessage = function(message) {
         // Create the connection for the channel to actually do stuff in
        var newConIndex = currentUserConnections.length;

        currentUserConnections[newConIndex] = CreateNewConnection(message.data, false);
        currentUserConnections[newConIndex].connect();
    };

    newConnection.session = {
        data: true
    };
    newConnection.userid = currentUserID;
    newConnection.open();

    return newConnection;
} // end CreateHomeConnection()

// Function for creating new connections
// Create and return a connection for connecting to someone else's local connection
function CreateNewConnection(connectingToUserID, connectingToUsersHome) {
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
    // Set STUN servers!
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
        console.log("OnNewSession fired!");
        console.log(session);

        session.join();
    };

    // When the new connection opens
    newConnection.onopen = function(e) {
        if(connectingToUsersHome) {
            // Send a message to the connection to tell the user which room we want them to join
            newConnection.send(GenerateRoomName(currentUserID, connectingToUserID));

            // Remove the connection we have to the user's home connection, and shift the place of the connection we want
            currentUserConnections[currentUserConnections.length - 2] = currentUserConnections.pop();
        } // end if


    } // end onopen()


    // On getting local or remote media stream
    newConnection.onstream = function (e) {
        console.log(e);

        if(e.type == "local") {

        } else {

        } // end if/else
    };

    newConnection.onMediaFile = function(e) {
        console.log(e);
        // e.mediaElement (it is video-element)
        // e.userid

        document.body.appendChild(e.mediaElement);
    };

    newConnection.onmessage = function(message) {
        console.log(message);

        // Add the chat message to the output box
        var chatOutput = document.getElementById("text-chat-output");
        chatOutput.innerHTML += message.userid + ": " + (message.data).replace(/[<>]/g, '') + "<br>";
    };

    newConnection.session = {
        data: true
    };

    return newConnection;
} // end CreateNewConnection()


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

        // Reset the chat input box
        chatInputBox.value = "";
    } // end if
};


document.getElementById("webm-file").onchange = function() {
    currentUserConnections[0].connectionObject.shareMediaFile(this.files[0]);
};

// Connect to another user on button click!
document.getElementById("connect-to-user").onclick = function () {
    var userIDInput = document.getElementById('userID-input');
    var userIDToConnect = userIDInput.value;

    if (userIDToConnect !== undefined) {
        userIDToConnect = userIDToConnect.trim();
    } else {
        userIDToConnect = "";
    } // end if/else

    // If nothing is entered into the input box, do nothing
    if (userIDToConnect == "") {
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

// Check for Web Worker support
if (typeof(Worker) !== undefined) {
    // Yes! Web worker support!
    // Some code.....
} else {
    // No Web Worker support..
} // end if/else

// Init current user ID var
var currentUserID;

// Check for localstorage support!
if (typeof (Storage) !== undefined) {
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

    // Place the currentUserID into the title bar so the user knows who they are
    document.getElementById('userID').innerHTML += currentUserID;


    // Attempt to get the locally stored userConnectionHistory
    var userConnectionHistory = localStorage.getItem("userConnectionHistory");
    // Check if userConnectionHistory is null, if not, then parse it!
    if (userConnectionHistory !== null) {
        userConnectionHistory = JSON.parse(userConnectionHistory);

        // Set contact list to the connection history
        //contactList.data = userConnectionHistory;
    }// end if


    // Attempt to get the locally stored userChatLog
    var userChatLog = localStorage.getItem("userChatLog");
    // Check if userConnectionHistory is null, if not, then parse it!
    if (userChatLog !== null) {
        userChatLog = JSON.parse(userChatLog);
    }// end if

} else {
    console.log("No localstorage support... :(");
} // end if/else

// Create the current user's home connection
var homeConnection = CreateHomeConnection();
console.log("Home Connection:");
console.log(homeConnection);


// Make an array for all of current user's connections
var currentUserConnections = [];
