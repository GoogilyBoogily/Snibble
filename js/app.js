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

    for(var i = 0; i < 6; i++) {
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
        //--------
        // TODO: Connect to the user we want to connect to by connecting to their channel, and use our userID
        //       as the sessionid. This should work perfectly for a two user connection, but breaks down when
        //         adding a third user.
        //         A way to make this work is by simply checking where we're connected to that user, and send
        //         a message through a chat that way.
        //--------

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
        return;
    } // end if/else
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

    /*
        Commenting out prerecorded media stuff because it don't work
    newConnection.onMediaFile = function(e) {
        console.log(e);
        // e.mediaElement (it is video-element)
        // e.userid
        console.log(newConnection.preRecordedMedias);

        document.body.appendChild(e.mediaElement);
    };
    */

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

    // Turn off bandwidth (Dunno what this does...)
    newConnection.bandwidth = {};
    /*
    connection.bandwidth = {
        audio: 50,
        video: 256,
        data: 1638400,
        screen: 300      // 300kbps
    };

    // or change them individually
    connection.bandwidth.audio = 80;
    connection.bandwidth.video = 2048;
    connection.bandwidth.data  = 1638400;
    connection.bandwidth.screen = 300;
    */

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

/*
    More prerecorded media stuff
document.getElementById("webm-file").onchange = function() {
    currentUserConnections[0].shareMediaFile(this.files[0]);
};
*/

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


// --------------------------------------------------------
// Start interact.js stuff
// --------------------------------------------------------

// Target elements with the "draggable" class
interact('.draggable')
    .draggable({
        // Allow dragging of multple elements at the same time
        max: 1,

        // Call this on dragmove start
        onstart: function (event) {},
        // Call this function on every dragmove event
        onmove: function (event) {
            var target = event.target;
            // Keep the dragged position in the data-x/data-y attributes
            var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
            var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

            // Translate the element
            target.style.webkitTransform =
            target.style.transform =
                'translate(' + x + 'px, ' + y + 'px)';

            // Update the posiion attributes
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
        }, // end onmove()
        // Call this function on every dragend event
        onend: function (event) {

        } // end onend()
    }) // end draggable()
    // Keep the element within the area of it's parent
    .restrict({
        drag: "parent",
        endOnly: false,
        elementRect: {top: 0, left: 0, bottom: 1, right: 1}
    }) // end restrict()
    // Set the element as resizable
    .resizable({
        // Call this on dragmove start
        onstart: function (event) {},
        // Call this on dragmove event
        onmove : function (event) {
            var target = event.target;
            // add the change in coords to the previous width of the target element
            var newWidth  = parseFloat(target.style.width ) + event.dx;
            var newHeight = parseFloat(target.style.height) + event.dy;

            // update the element's style
            target.style.width  = newWidth + 'px';
            target.style.height = newHeight + 'px';
        },
        // Call his on dragmove end
        onend : function (event) {},

        axis : 'xy', // default is 'xy',

        // limit multiple resizes.
        // See the explanation in @Interactable.draggable example
        max: 1,
        maxPerElement: 1
    }); // end resizable()

// Allow more than one interaction at a time
interact.maxInteractions(Infinity);

