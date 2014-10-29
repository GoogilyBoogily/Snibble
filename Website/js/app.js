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
         // Create the connection for the actual room
        var newConIndex = currentUserConnections.length;

        currentUserConnections[newConIndex] = CreateNewConnection(message.data);
        currentUserConnections[newConIndex].connect();
    };

    newConnection.session = {
        data: true
    };
    newConnection.userid = currentUserID;
    newConnection.extra = {};
    newConnection.sessionid = currentUserID;
    newConnection.open();

    return newConnection;
} // end CreateHomeConnection()




// Make an array for all of current user's connections
var currentUserConnections = [];




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
        currentUserConnections[newConIndex] = CreateNewRemoteHomeConnection(userIDToConnectTo);
        currentUserConnections[newConIndex].connect(userIDToConnectTo);


        // Create the connection for the actual room
        var newConIndex = currentUserConnections.length;

        // TODO: Make the new channel be named after both people's userID or something
        currentUserConnections[newConIndex] = CreateNewConnection("abcd");
        currentUserConnections[newConIndex].open();

        console.log("Opened connection to new room.");

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

// Create and return a connection for connecting to someone else's local connection
function CreateNewRemoteHomeConnection(connectingToUserID) {
    var newConnection = new RTCMultiConnection(connectingToUserID);

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
        // TODO: Send the correct channel name
        newConnection.send("abcd");
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
        console.log(message);
    };

    newConnection.session = {
        data: true
    };
    newConnection.userid = currentUserID;

    return newConnection;
} // end CreateHomeConnection()

// Function for creating new connections
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
    // Set STUN servers!
    newConnection.iceServers = iceServers;

    // Set which kind of media you want to share over the session
    newConnection.session = {
        data: true
    };

    // When the new connection opens
    newConnection.onopen = function(e) {
        // e.userid
        // e.extra
        // Set the currentlySelected user to the newly connected one
        currentlySelected = e.userid;

        console.log(newConnection);
    } // end onopen()

    // On getting local or remote media stream
    newConnection.onstream = function (e) {
        if (e.type == "local") {

        } else {

        } // end if/else
    };

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

    newConnection.onMediaFile = function(e) {
        // e.mediaElement (it is video-element)
        // e.userid

        document.body.appendChild(e.mediaElement);
    };

    /*
    //
    // Text chat stuff
    //
    // When a new message is received
    newConnection.onmessage = function (e) {
        console.log(e.userid + ": " + e.data);
        AddToChatLog(e.userid, currentUserID, e.data);

        var chatOutput = document.getElementById('chat-output');
        var div = document.createElement('div');
        div.innerHTML = '<div id="chat-text">' + e.userid + ": " + e.data + '</div>';
        chatOutput.appendChild(div);
    };

    // When sending a new message
    var chatInput = document.getElementById('chat-input');
    chatInput.onkeydown = function (e) {
        if (e.keyCode == 13 && this.value.trim() != '') {
            console.log("(Me)" + newConnection.userid + ": " + this.value);

            SendChatMessage(currentUserID, currentlySelected, this.value);

            newConnection.send(this.value);

            var chatOutput = document.getElementById('chat-output');
            var div = document.createElement('div');
            div.innerHTML = '<div id="chat-text">' + "Me: " + this.value + '</div>';
            chatOutput.appendChild(div);

            this.value = '';
        } // end if
    };
    */

    return newConnection;
} // end CreateNewConnection()


/*
function SendChatMessage(fromUserID, toUserID, messageToSend) {
    // If we're connected to the user we want to send the message to, send it!
    //   Else, connect to them, and then send the message!
    var isConnected = IsCurrentlyConnected(toUserID);
    if (isConnected.connected) {
        console.log("We're connected! Send the message!");
        currentUserConnections[isConnected.index]
                .connectionObject.peers[toUserID].sendCustomMessage(
                    {"type": "textChat",
                     "from": fromUserID,
                     "to": toUserID,
                     "message": messageToSend});

    } else {
        console.log("Not connected, attempting connection now...");
        ConnectToUser(toUserID);

        // TODO: This is almost defintiely a bad workaround. Notify Jack and think of a better way
        var justMadeConLength = currentUserConnections.length - 1;
        currentUserConnections[justMadeConLength].connectionObject
            .onstatechange = function (state, reason) {
                if(state == 'connected-with-initiator') {
                    this.sendCustomMessage(
                        {"type":"textChat",
                         "from": fromUserID,
                         "to": toUserID,
                         "message": messageToSend});
                } // end if
            };
    } // end if/else

    // Add the message to the user's chat log
    AddToChatLog(fromUserID, toUserID, messageToSend);

} // end SendChatMessage()

function AddToChatLog(fromUserID, toUserID, message) {
    // If userChatLog is null, just set its value to the new entry
    //   Else, try to find the userID and add the new message to the log
    if (userChatLog == null) {
        userChatLog = [{"userID": fromUserID,
                        "messages":
                                [{"timestamp": GetDateTime(),
                                 "to": toUserID,
                                 "from": fromUserID,
                                 "message": message}]}];
    } else {
        // For all entries in userChatLog, try and find the given userID
        // If we found it, append the new message onto it and break
        for (var i = 0; i < userChatLog.length; i++) {
            if (userChatLog[i].userID == fromUserID) {
                userChatLog[i].messages.unshift({"timestamp": GetDateTime(),
                                                 "to": toUserID,
                                                 "from": fromUserID,
                                                 "message": message});
                // Swap the current userID index with the first one to keep the log in chronological order
                userChatLog[0] = userChatLog.splice(i, 1, userChatLog[0])[0];
                break;
            } // end if
        } // end for
        // We can't find the userID, so add the new user object with the message
        userChatLog.unshift({"userID": fromUserID,
                             "messages":
                                    [{"timestamp": GetDateTime(),
                                    "to": toUserID,
                                    "from": fromUserID,
                                    "message": message}]});
    } // end if/else

    // Save the updated chatlog to the localStorage
    localStorage.setItem("userChatLog", JSON.stringify(userChatLog));
} // end AddToChatLog()
*/

document.getElementById("webm-file").onchange = function() {
currentUserConnections[1].connectionObject.shareMediaFile(this.files[0]);
};

// Connect to another user on button click!
document.getElementById('connect-to-user').onclick = function () {
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
