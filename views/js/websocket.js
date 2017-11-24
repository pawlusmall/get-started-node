//let socket = new WebSocket('ws://websocket-claval-fibrolite.mybluemix.net/');
let socket = {}


const joins = [
    ['Head', 'Neck'], ['Neck', 'SpineShoulder'],
    ['SpineShoulder', 'ShoulderLeft'], ['SpineShoulder', 'ShoulderRight'],
    ['ShoulderLeft', 'ElbowLeft'], ['ShoulderRight', 'ElbowRight'],
    ['ElbowLeft', 'WristLeft'], ['ElbowRight', 'WristRight'],
    ['WristLeft', 'HandLeft'], ['WristRight', 'HandRight'],
    ['SpineShoulder', 'SpineMid'], ['SpineMid', 'SpineBase'],
    ['SpineBase', 'HipLeft'], ['SpineBase', 'HipRight'],
    ['HipLeft', 'KneeLeft'], ['HipRight', 'KneeRight'],
    ['KneeLeft', 'AnkleLeft'], ['KneeRight', 'AnkleRight'],
    ['AnkleLeft', 'FootLeft'], ['AnkleRight', 'FootRight']
];

class Body {

    update(bodyparts) {
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
        for (let bodypart of bodyparts) {
            if (bodypart.name.includes("Tip") || bodypart.name.includes('Thumb')) {
                continue;
            }
            this[bodypart.name] = new THREE.Vector3(
                bodypart.positions[0].x,
                bodypart.positions[0].y,
                bodypart.positions[0].z
            );
            let geometry = new THREE.SphereGeometry(0.05, 32, 32);

            var material = new THREE.MeshBasicMaterial({color: 0x000000});
            var sphere = new THREE.Mesh(geometry, material);
            sphere.position.x = bodypart.positions[0].x;
            sphere.position.y = bodypart.positions[0].y;
            sphere.position.z = bodypart.positions[0].z;
            scene.add(sphere);
        }
        this.drawCylinder()
    }

    drawCylinder() {
        for (let join of joins) {
            /*let material = new THREE.LineBasicMaterial({
                color: 0x0000ff
            });
            let geometry = new THREE.Geometry();
            console.log(this[join[0]])
            geometry.vertices.push(
                this[join[0]],
                this[join[1]]
            );
            let line = new THREE.Line(geometry, material);
            scene.add(line);*/
            scene.add(Body.wayMesh(this[join[0]], this[join[1]]))
        }
    }

    static wayMesh(nodeA, nodeB) {
        let vectorA = new THREE.Vector3(nodeA.x, nodeA.y, nodeA.z);
        let vectorB = new THREE.Vector3(nodeB.x, nodeB.y, nodeB.z);
        let direction = new THREE.Vector3().subVectors(vectorA, vectorB);
        let orientation = new THREE.Matrix4();
        orientation.lookAt(vectorA, vectorB, new THREE.Object3D().up);
        orientation.multiply(new THREE.Matrix4().set(1, 0, 0, 0,
            0, 0, 1, 0,
            0, -1, 0, 0,
            0, 0, 0, 1));
        let edgeGeometry = new THREE.CylinderGeometry(0.04, 0.04, direction.length(), 20, 1);
        let mesh = new THREE.Mesh(edgeGeometry, new THREE.MeshBasicMaterial({color: 0xFFFFFF}));
        mesh.applyMatrix(orientation);
        // position based on midpoints - there may be a better solution than this
        mesh.position.x = (vectorB.x + vectorA.x) / 2;
        mesh.position.y = (vectorB.y + vectorA.y) / 2;
        mesh.position.z = (vectorB.z + vectorA.z) / 2;
        return mesh;
    }

}

const body = new Body()


socket.onclose = () => {
    console.log("Close!!!!!!!");
};
let ttt = '{"topic":"iot-2/type/kinectDeviceType/id/kinectDeviceOVI2/evt/kinectEvent/fmt/json","payload":{"packetID":59658,"user":[{"id":72057594037988880,"leftHandState":"Unknown","rightHandState":"NotTracked","userId":"","bodyParts":[{"name":"SpineBase","isPresent":true,"isTracked":true,"positions":[{"x":-1.10993791,"y":0.0158039741,"z":2.512211}]},{"name":"SpineMid","isPresent":true,"isTracked":true,"positions":[{"x":-1.13921034,"y":0.35990712,"z":2.52099824}]},{"name":"Neck","isPresent":true,"isTracked":true,"positions":[{"x":-1.16419458,"y":0.693303168,"z":2.51986361}]},{"name":"Head","isPresent":true,"isTracked":true,"positions":[{"x":-1.15663373,"y":0.8257881,"z":2.54184437}]},{"name":"ShoulderLeft","isPresent":true,"isTracked":true,"positions":[{"x":-1.18763924,"y":0.512033343,"z":2.361816}]},{"name":"ElbowLeft","isPresent":true,"isTracked":true,"positions":[{"x":-1.2797507,"y":0.2811145,"z":2.307625}]},{"name":"WristLeft","isPresent":true,"isTracked":true,"positions":[{"x":-1.4068135,"y":0.0877103359,"z":2.374244}]},{"name":"HandLeft","isPresent":true,"isTracked":true,"positions":[{"x":-1.4633553,"y":0.021263143,"z":2.41763616}]},{"name":"ShoulderRight","isPresent":true,"isTracked":true,"positions":[{"x":-0.9967312,"y":0.5218345,"z":2.5884006}]},{"name":"ElbowRight","isPresent":true,"isTracked":true,"positions":[{"x":-0.9568433,"y":0.251217037,"z":2.63651872}]},{"name":"WristRight","isPresent":true,"isTracked":true,"positions":[{"x":-1.17485321,"y":0.184985146,"z":2.47527814}]},{"name":"HandRight","isPresent":true,"isTracked":true,"positions":[{"x":-1.23200083,"y":0.120226778,"z":2.51377678}]},{"name":"HipLeft","isPresent":true,"isTracked":true,"positions":[{"x":-1.152308,"y":0.02128483,"z":2.4268477}]},{"name":"KneeLeft","isPresent":true,"isTracked":true,"positions":[{"x":-1.03838134,"y":-0.388388932,"z":2.3004086}]},{"name":"AnkleLeft","isPresent":true,"isTracked":false,"positions":[{"x":-0.95070827,"y":-0.6996305,"z":2.20336127}]},{"name":"FootLeft","isPresent":true,"isTracked":false,"positions":[{"x":-0.871532261,"y":-0.7274351,"z":2.113103}]},{"name":"HipRight","isPresent":true,"isTracked":true,"positions":[{"x":-1.03806067,"y":0.009765234,"z":2.52976227}]},{"name":"KneeRight","isPresent":true,"isTracked":false,"positions":[{"x":-0.9924277,"y":-0.381088,"z":2.55593348}]},{"name":"AnkleRight","isPresent":true,"isTracked":true,"positions":[{"x":-0.934167862,"y":-0.713238657,"z":2.24536753}]},{"name":"FootRight","isPresent":true,"isTracked":true,"positions":[{"x":-0.9774022,"y":-0.79469943,"z":2.192795}]},{"name":"SpineShoulder","isPresent":true,"isTracked":true,"positions":[{"x":-1.15879464,"y":0.6114144,"z":2.52202678}]},{"name":"HandTipLeft","isPresent":true,"isTracked":true,"positions":[{"x":-1.4826436,"y":-0.0425369069,"z":2.42964625}]},{"name":"ThumbLeft","isPresent":true,"isTracked":true,"positions":[{"x":-1.4499588,"y":0.026004307,"z":2.35190916}]},{"name":"HandTipRight","isPresent":true,"isTracked":false,"positions":[{"x":-1.22367549,"y":0.111549087,"z":2.497127}]},{"name":"ThumbRight","isPresent":true,"isTracked":false,"positions":[{"x":-1.31310582,"y":0.136677742,"z":2.487458}]}]}]},"deviceId":"kinectDeviceOVI2","deviceType":"kinectDeviceType","eventType":"kinectEvent","format":"json","_msgid":"2810b5f0.42b64a"}';
socket.onmessage = event => {

    let data = JSON.parse(ttt)
    let users = data.payload.user;

    if (users) {
        let bodyparts = users[0].bodyParts;

        body.update(bodyparts)
    }
};
setTimeout(() => socket.onmessage(), 1000);

socket.onopen = function (event) {
    console.log("Connected to socket")
};