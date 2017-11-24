var camera, scene, renderer, geometry, material, mesh, skeleton, mixer, clock, controls;

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

        var map = new Object();
        map["ShoulderLeft"] = 6;
        map["ShoulderRight"]= 25;
        map["ElbowLeft"]= 8;
        map["ElbowRight"] = 27;
        map["WristLeft"] = 9;
        map["WristRight"] = 28;
        map["Neck"] = 4;
        map["Head"] = 5;
        map["SpineShoulder"] = 3;
        map["SpineMid"] = 1; //QUizas 0
        map["SpineBase"] = 0;
        map["HipLeft"] = 44;
        map["HipRight"] = 48;
        map["KneeLeft"] = 45;
        map["KneeRight"] = 49;
        map["AnkleLeft"] = 46;
        map["AnkleRight"] = 50;
        map["FootLeft"] = 47;
        map["FootRight"] = 51;
        map["ThumbLeft"] = 53;
        map["ThumbRight"] =58;





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
