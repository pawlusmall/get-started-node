var camera, scene, renderer, geometry, material, mesh, mixer, clock, container;

init();
animate();

function init() {

    scene = new THREE.Scene();

    clock = new THREE.Clock();

    container = document.getElementById( 'container' );

    camera = new THREE.PerspectiveCamera( 25, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set( 0, 3, 20 );
    scene.add(camera);

    var ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 );
    scene.add( ambientLight );

    var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
    directionalLight.position.set( 1, 1, - 1 );
    scene.add( directionalLight );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );

    container.appendChild(renderer.domElement);
    window.addEventListener( 'resize', onWindowResize, false );

    loadModel();
}

function loadModel() {
    var loader = new THREE.ColladaLoader();
    loader.load('models/stormtropper.dae', function ( collada ) {
        var avatar = collada.scene;
        avatar.rotation.z = 3;
        var animations = collada.animations;
        scene.add(avatar);       
        mixer = new THREE.AnimationMixer( avatar );
        var action = mixer.clipAction( animations[ 0 ] ).play();
        console.log("loaded!");        
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
