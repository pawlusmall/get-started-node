let socket = new WebSocket('ws://interfacehackaton-subtetanical-myxomatous.mybluemix.net:8080/');

socket.onmessage = event => {
    console.log("Message received: " + event.data)
};
socket.onopen = function (event) {
    socket.send("Here's some text that the server is urgently awaiting!");
};
