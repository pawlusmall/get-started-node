var MidiPlayer = require('MidiPlayer');

var loadFile, loadDataUri, Player;
var AudioContext = window.AudioContext || window.webkitAudioContext || false; 
var ac = new AudioContext || new webkitAudioContext;

var camera, scene, renderer, geometry, material, mesh, skeleton, mixer, clock, controls;

init();
changeBackground(0);
animate();

function init() {

    scene = new THREE.Scene();
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera( 25, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set( 0, 0, 10 );
    scene.add(camera);

    var ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 );
    scene.add( ambientLight );

    var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
    directionalLight.position.set( 1, 1, - 1 );
    scene.add( directionalLight );

    renderer = new THREE.WebGLRenderer({ antialias: true , alpha: true});
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( 0xffffff, 0 );

    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render );

    document.body.appendChild(renderer.domElement);
    window.addEventListener( 'resize', onWindowResize, false );    

    loadModel();

}

function loadModel() {

    var loader = new THREE.ColladaLoader();
    loader.load('models/stormtropper.dae', function ( collada ) {
        collada.scene.traverse(child => {
            if (child instanceof THREE.SkinnedMesh) {
                mesh = child;
            }
        });

        mesh.rotation.z = 3;

        skeleton = new THREE.SkeletonHelper(mesh);
        skeleton.visible = true;
        scene.add(skeleton);

        var animations = collada.animations;
        mixer = new THREE.AnimationMixer(mesh);
        //var action = mixer.clipAction(animations[ 0 ]).play();
        scene.add(mesh);

        mesh.skeleton.bones[0].position.x = 1;
        mesh.skeleton.bones[3].position.y = 2;
        mesh.skeleton.bones[10].position.x = 1;
        mesh.skeleton.bones[20].position.y = 2;
    });

}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {
    var delta = clock.getDelta();

    if ( mixer !== undefined ) {
        mixer.update( delta );
    }
    renderer.render(scene, camera);
}

    
    
var xhr = new XMLHttpRequest();
xhr.open('get', "http://localhost:8000/midi/CantinaBand.mid");
xhr.responseType = 'blob'; // we request the response to be a Blob
xhr.onload = function(e){
    var reader  = new FileReader();
    reader.readAsArrayBuffer(this.response);
    reader.addEventListener("load", function () {
        Player = new MidiPlayer.Player(function(event) {
            
        });
        Player.loadArrayBuffer(reader.result);
        Player.play();
    });
}
xhr.send();

var Player = new MidiPlayer.Player(function(event) {
	console.log(event);
});


function changeBackground(index) {
    var image;
    switch (index) {
        case 0:
        image = "background.jpg"
        break;
    }
    document.body.style.background = "url('images/" + image + "') left top / cover no-repeat";
}
    
