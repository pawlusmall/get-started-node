let socket = new WebSocket('ws://websocket-claval-fibrolite.mybluemix.net/');


var map = new Object();
map["ShoulderLeft"] = 6;
map["ShoulderRight"]= 25;
map["ElbowLeft"]= 8;
map["ElbowRight"] = 27;
map["WristLeft"] = 9;
map["WristRight"] = 28;
map["Neck"] = 4;
map["Head"] = 5;
map["SpineShoulder"] = 3;
map["SpineMid"] = 1; //QUizas 0
map["SpineBase"] = 0;
map["HipLeft"] = 44;
map["HipRight"] = 48;
map["KneeLeft"] = 45;
map["KneeRight"] = 49;
map["AnkleLeft"] = 46;
map["AnkleRight"] = 50;
map["FootLeft"] = 47;
map["FootRight"] = 51;
map["ThumbLeft"] = 53;
map["ThumbRight"] =58;

socket.onmessage = event => {

    let users = event.data.payload.user;
    let bodyparts = users[0].bodyparts;

    for(let bodypart of bodyparts){

    }


    console.log("Message received: " + event.data)
};
socket.onopen = function (event) {
    console.log("Connected to socket")
};
