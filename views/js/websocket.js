let socket = new WebSocket('ws://websocket-claval-fibrolite.mybluemix.net/');
//let socket = {}


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
        let i = 0;
        while (scene.children.length > i) {
            if (scene.children[i].name === "nodelete") {
                i += 1;
            } else {
                scene.remove(scene.children[i]);
            }
        }
        for (let bodypart of bodyparts) {
            if (bodypart.name.includes("Tip") || bodypart.name.includes('Thumb')) {
                continue;
            }
            if (this[bodypart.name]) {
                this[bodypart.name].position.x = bodypart.positions[0].x;
                this[bodypart.name].position.y = bodypart.positions[0].y;
                this[bodypart.name].position.z = -bodypart.positions[0].z;
            } else {
                let geometry = new THREE.SphereGeometry(0.05, 32, 32);

                var material = new THREE.MeshBasicMaterial({color: 0x000000});
                var sphere = new THREE.Mesh(geometry, material);
                sphere.position.x = bodypart.positions[0].x;
                sphere.position.y = bodypart.positions[0].y;
                sphere.position.z = -bodypart.positions[0].z;
                sphere.name = "nodelete";
                this[bodypart.name] = sphere
                scene.add(sphere);
            }
        }

        if (!this.headSprite) {
            var map = new THREE.TextureLoader().load("images/head.png");
            var material = new THREE.SpriteMaterial({map: map, color: 0xffffff, fog: true});
            var sprite = new THREE.Sprite(material);
            sprite.position.x = this.Head.x;
            sprite.position.y = this.Head.y;
            sprite.position.z = this.Head.z + 0.2;
            sprite.scale.x = 0.4;
            sprite.scale.y = 0.4;
            sprite.name = "nodelete";
            scene.add(sprite);
            this.headSprite = sprite
        }
        this.headSprite.position.x = this.Head.position.x;
        this.headSprite.position.y = this.Head.position.y;
        this.headSprite.position.z = this.Head.position.z + 0.2;


        this.drawCylinder()
    }

    drawCylinder() {
        for (let join of joins) {
            if ((join[0] === 'SpineShoulder' && join[1] === 'SpineMid') || join[1] === 'SpineBase') {
                scene.add(Body.wayMesh(this[join[0]].position, this[join[1]].position, 0.15))
            } else {
                scene.add(Body.wayMesh(this[join[0]].position, this[join[1]].position, 0.04))
            }
        }
    }

    static wayMesh(nodeA, nodeB, size) {
        let vectorA = new THREE.Vector3(nodeA.x, nodeA.y, nodeA.z);
        let vectorB = new THREE.Vector3(nodeB.x, nodeB.y, nodeB.z);
        let direction = new THREE.Vector3().subVectors(vectorA, vectorB);
        let orientation = new THREE.Matrix4();
        orientation.lookAt(vectorA, vectorB, new THREE.Object3D().up);
        orientation.multiply(new THREE.Matrix4().set(1, 0, 0, 0,
            0, 0, 1, 0,
            0, -1, 0, 0,
            0, 0, 0, 1));
        let edgeGeometry = new THREE.CylinderGeometry(size, size, direction.length(), 20, 1);
        let mesh = new THREE.Mesh(edgeGeometry, new THREE.MeshBasicMaterial({color: 0xFFFFFF}));
        mesh.applyMatrix(orientation);
        // position based on midpoints - there may be a better solution than this
        mesh.position.x = (vectorB.x + vectorA.x) / 2;
        mesh.position.y = (vectorB.y + vectorA.y) / 2;
        mesh.position.z = (vectorB.z + vectorA.z) / 2;
        return mesh;
    }

}

const body = new Body();


socket.onclose = () => {
    console.log("Close!!!!!!!");
};
let a = 0;
socket.onmessage = event => {
    let data = JSON.parse(event.data)
    let users = data.payload.user;

    if (users && users[0]) {
        body.update(users[0].bodyParts)
    }
};
//setTimeout(() => socket.onmessage(), 1000);

socket.onopen = function (event) {
    console.log("Connected to socket")
};