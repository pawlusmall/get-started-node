var MidiPlayer = require('MidiPlayer');
var loadFile, loadDataUri;
var AudioContext = window.AudioContext || window.webkitAudioContext || false; 
var ac = new AudioContext || new webkitAudioContext;

var camera, scene, renderer, geometry, material, mesh, skeleton, mixer, clock, controls;

var instruments = [ 'acoustic_grand_piano-mp3.js', 'acoustic_bass-mp3.js', 'guitar_harmonics-mp3.js', 'acoustic_guitar_steel-mp3.js','acoustic_guitar_nylon-mp3.js']
var volume = [1,0,0,0,0];
var instrumentsSoundfont = [];
var songs = ["cantina", "bruno", "acdc"];

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



function loadInstrument(index, song){
    Soundfont.instrument(ac, 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/MusyngKite/'+instruments[index],{gain:volume[index]}).then(function (instrument) {


        loadDataUri = function() {
            var Player;        
            var xhr = new XMLHttpRequest();
            xhr.open('get', "http://localhost:8000/midi/" + song + "/" + instruments[index] +".mid");
            xhr.responseType = 'blob'; // we request the response to be a Blob
            xhr.onload = function(e){
                var reader  = new FileReader();
                reader.readAsArrayBuffer(this.response);
                reader.addEventListener("load", function () {
                    Player = new MidiPlayer.Player(function(event) {
                        instrumentsSoundfont[index] = [instrument,Player];
                        if (event.name == 'Note on' && event.velocity > 0) {
                            instrument.play(event.noteName, ac.currentTime, 1/2*event.velocity/100);
                            console.log(event);
                        }
                    });
                    Player.loadArrayBuffer(reader.result);
                    Player.play();
                });
            }
            xhr.send();

	}

	loadDataUri();
    });
}


function changeBackground(index) {
    var image;
    switch (index) {
        case 0:
        image = "background.jpg"
        break;
        case 1:
        image = "street.jpg"
        break;
        case 2:
        image = "stage.jpg"
        break;
    }
    document.body.style.background = "url('images/" + image + "') left top / cover no-repeat";
}

function loadSong(indexSong){
    stopSong();
    if (indexSong > songs.length-1)
        indexSong = 0;
    changeBackground(indexSong);
    loadInstrument(0, songs[indexSong]);
    loadInstrument(1, songs[indexSong]);
    loadInstrument(2, songs[indexSong]);
    loadInstrument(3, songs[indexSong]);
    loadInstrument(4, songs[indexSong]);
}

function stopSong(){
    if (instrumentsSoundfont && instrumentsSoundfont.length){
        for (i=0; i<instrumentsSoundfont.length; i++){
            instrumentsSoundfont[i][0].stop();
            instrumentsSoundfont[i][1].stop();
        }
    }

}
