let socket = new WebSocket('ws://interfacehackaton-subtetanical-myxomatous.mybluemix.net:8080/');

socket.onmessage = event => {
    console.log("Message received: " + event.data)
};
socket.onopen = function (event) {
    console.log("Connected to socket")
};
