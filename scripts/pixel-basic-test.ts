// Minimal Three.js test for Pixel 3a validation
// Reads back pixels via glReadPixels to verify rendering
import path from 'path';
const { app, resolveTransport, standaloneShutdownStrategy } = require('tsyne');
const { initThreeJS } = require(path.join(process.cwd(), 'trine/integration/init'));

app(resolveTransport(), { title: 'T', shutdownStrategy: standaloneShutdownStrategy() }, async (a: any) => {
  a.window({ title: 'T', width: 450, height: 350 }, async (win: any) => {
    const { THREE } = await initThreeJS(a, win, { width: 400, height: 300 });
    const camera = new THREE.PerspectiveCamera(70, 400/300, 0.1, 100);
    camera.position.z = 3;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const c1 = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    c1.position.x = -1.5; scene.add(c1);
    const c2 = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    scene.add(c2);
    const c3 = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x0000ff }));
    c3.position.x = 1.5; scene.add(c3);

    const renderer = new THREE.WebGLRenderer();
    const glCtx = renderer.getContext();
    console.log('GL context type:', typeof glCtx);
    console.log('GL viewport exists:', typeof glCtx?.viewport);
    console.log('GL drawingBufferWidth:', glCtx?.drawingBufferWidth);
    console.log('GL drawingBufferHeight:', glCtx?.drawingBufferHeight);
    renderer.setSize(400, 300);
    console.log('rendering...');

    // Render 3 frames
    for (let i = 0; i < 3; i++) {
      c1.rotation.y = i * 0.3;
      c2.rotation.y = i * 0.3 + 2;
      c3.rotation.y = i * 0.3 + 4;
      renderer.render(scene, camera);
      const gl = renderer.getContext();
      if (gl?.flush) await gl.flush();
      await new Promise(r => setTimeout(r, 50));
    }
    console.log('rendered 3 frames OK');

    // Read back pixels at key locations to verify rendering
    const gl = renderer.getContext();
    if (gl && gl.readPixels) {
      // Sample points: center of each cube and background
      const points = [
        { name: 'bg-topleft', x: 10, y: 290 },
        { name: 'red-cube', x: 67, y: 150 },   // left third
        { name: 'green-cube', x: 200, y: 150 },  // center
        { name: 'blue-cube', x: 333, y: 150 },   // right third
        { name: 'bg-center-top', x: 200, y: 280 },
        { name: 'bg-bottom', x: 200, y: 20 },
      ];

      for (const pt of points) {
        const pixels = new Uint8Array(4);
        gl.readPixels(pt.x, pt.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        if (gl.flush) await gl.flush();
        console.log(`PIXEL ${pt.name} (${pt.x},${pt.y}): R=${pixels[0]} G=${pixels[1]} B=${pixels[2]} A=${pixels[3]}`);
      }
    } else {
      console.log('gl.readPixels not available');
    }

    win.show();
    console.log('window shown - exiting in 3s');
    await new Promise(r => setTimeout(r, 3000));
    process.exit(0);
  });
});
