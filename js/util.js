function GetDateTime() {
    var now     = new Date();
    var year    = now.getFullYear();
    var month   = now.getMonth() + 1;
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

// Generate a random string with length as the param
function GenerateRandomString(lengthOfString) {
    // TODO: Add error handling for if the length isn't given or is negative

    var text = "";
    var charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i = 0; i < lengthOfString; i++) {
        text += charSet.charAt(Math.floor(Math.random() * charSet.length));
    } // end for

    return text;
} // end GenerateUserID()

// Horribly named function attempting to mitigate echo in calls
function AfterEach(setTimeoutInteval, numberOfTimes, callback, startedTimes) {
    startedTimes = (startedTimes || 0) + 1;

    if(startedTimes >= numberOfTimes) {
        return;
    } // end if

    setTimeout(function() {
        callback();
        AfterEach(setTimeoutInteval, numberOfTimes, callback, startedTimes);
    }, setTimeoutInteval);
} // end AfterEach()
