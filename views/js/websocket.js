let socket = new WebSocket('ws://websocket-claval-fibrolite.mybluemix.net/');

socket.onmessage = event => {
    console.log("Message received: " + event.data)
};
socket.onopen = function (event) {
    console.log("Connected to socket")
};
