let socket = new WebSocket('ws://interfacehackaton-subtetanical-myxomatous.mybluemix.net:8080/');

socket.onmessage = event => {
    console.log("Message received: " + event.data)
};
