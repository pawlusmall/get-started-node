
var camera, scene, renderer, geometry, material, mesh, skeleton, mixer, clock, controls;
var AudioContext = window.AudioContext || window.webkitAudioContext || false;
var ac = new AudioContext || new webkitAudioContext



init();
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

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );

    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render );

    document.body.appendChild(renderer.domElement);
    window.addEventListener( 'resize', onWindowResize, false );

    loadMIDIPlayer();
    loadModel();

}

var MainMesh;

function loadModel() {

    var loader = new THREE.ColladaLoader();
    loader.load('models/stormtropper.dae', function ( collada ) {
        collada.scene.traverse(child => {
            if (child instanceof THREE.SkinnedMesh) {
                mesh = child;
            }
        });

        mesh.rotation.z = 3;

        var animations = collada.animations;
        mixer = new THREE.AnimationMixer(mesh);
        //var action = mixer.clipAction(animations[ 0 ]).play();
        //scene.add(collada.scene);

        MainMesh = mesh;

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

function loadMIDILib(){
    Soundfont.instrument(ac, 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/MusyngKite/acoustic_guitar_nylon-mp3.js').then(function (instrument) {
        loadFile = function() {
            var file    = "midi/CantinaBand.mid"
            var reader  = new FileReader();
            if (file) reader.readAsArrayBuffer(file);

            reader.addEventListener("load", function () {
                Player = new MidiPlayer.Player(function(event) {
                    if (event.name == 'Note on') {
                        instrument.play(event.noteName, ac.currentTime, {gain:event.velocity/100});
                    }
                });

                Player.loadArrayBuffer(reader.result);

                play();
            }, false);
        }
    });
}

function loadMIDIPlayer(){
    Soundfont.instrument(ac, 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/MusyngKite/acoustic_guitar_nylon-mp3.js').then(function (instrument) {
        var Player = new MidiPlayer.Player(function(event) {
            console.log(event);
        });
        Player.loadFile('midi/CantinaBand.mid');
        instrument.play();
    });
}
