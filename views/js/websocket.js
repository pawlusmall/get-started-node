let socket = new WebSocket('ws://http://interfacehackaton-ultramicroscopic-nonflexibility.mybluemix.net/:8096/');

socket.onmessage = event => {
    console.log("Message received: " + event.data)
};
socket.onopen = function (event) {
    console.log("Connected to socket")
};
