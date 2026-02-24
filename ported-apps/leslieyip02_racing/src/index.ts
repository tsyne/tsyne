import MenuScene from "./scenes/MenuScene";

// set up scene
let scene = new MenuScene();

// keep track of time
let currentTime = 0;

// loops updates
function animate(timestamp?: number) {
    let dt = timestamp - currentTime;
    currentTime = timestamp;

    scene.camera.updateProjectionMatrix();
    scene.composer.render();

    scene.update(dt);

    requestAnimationFrame(animate);
}

// runs a continuous animation loop
animate()