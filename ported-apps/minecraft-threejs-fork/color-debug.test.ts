/**
 * Diagnostic test: isolate where the blue/dark rendering comes from.
 * Each step adds one layer of complexity to find the breaking point.
 */
import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { initThreeJS, enableThreeJSResize } from '../../trine/integration/init';
import { loadTexture } from '../../trine/integration/texture-loader';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

function ensureDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function setupScene(tsyneTest: TsyneTest, testName: string, buildFn: (THREE: any, scene: any, camera: any, renderer: any) => Promise<void>) {
  const WIDTH = 400;
  const HEIGHT = 300;

  const testApp = await tsyneTest.createApp((app) => {
    app.window({ title: testName, width: WIDTH, height: HEIGHT }, (win) => {
      win.setContent(() => { app.label('Loading...'); });
      win.show();

      setTimeout(async () => {
        const { THREE } = await initThreeJS(app, win, { width: WIDTH, height: HEIGHT });

        const camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, 0.01, 500);
        camera.position.set(0, 2, 5);
        camera.lookAt(0, 0, 0);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);

        // Same lights as minecraft
        const sun1 = new THREE.DirectionalLight(0xffffff, 0.8);
        sun1.position.set(1, 1.5, 1).normalize();
        scene.add(sun1);

        const sun2 = new THREE.DirectionalLight(0xffffff, 0.3);
        sun2.position.set(-1, 1.2, -0.5).normalize();
        scene.add(sun2);

        const ambient = new THREE.AmbientLight(0x606060);
        scene.add(ambient);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(1);
        renderer.setSize(WIDTH, HEIGHT);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        await buildFn(THREE, scene, camera, renderer);

        const gl = renderer.getContext();
        // Render a few frames
        for (let i = 0; i < 5; i++) {
          renderer.render(scene, camera);
          if (gl?.flush) await gl.flush();
          await new Promise(r => setTimeout(r, 50));
        }
      }, 100);
    });
  });

  const ctx = tsyneTest.getContext();
  await testApp.run();
  await ctx.wait(3000);

  ensureDir();
  const screenshotPath = path.join(SCREENSHOT_DIR, `debug-${testName}.png`);
  await tsyneTest.screenshot(screenshotPath);
  console.log(`Screenshot: debug-${testName}.png`);
}

describe('Color Debug', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: true });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('step1: plain green cube (no texture)', async () => {
    await setupScene(tsyneTest, 'step1-green-cube', async (THREE, scene, camera, renderer) => {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
    });
  }, 15000);

  test('step2: plain red + green cubes', async () => {
    await setupScene(tsyneTest, 'step2-two-cubes', async (THREE, scene, camera, renderer) => {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const green = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
      const red = new THREE.MeshPhongMaterial({ color: 0xff0000 });
      const m1 = new THREE.Mesh(geo, green);
      m1.position.set(-1, 0, 0);
      scene.add(m1);
      const m2 = new THREE.Mesh(geo, red);
      m2.position.set(1, 0, 0);
      scene.add(m2);
    });
  }, 15000);

  test('step3: textured cube (grass)', async () => {
    await setupScene(tsyneTest, 'step3-textured', async (THREE, scene, camera, renderer) => {
      const texPath = path.join(__dirname, 'src/static/textures/block/grass_top_green.png');
      const tex = await loadTexture(THREE, texPath);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;

      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshPhongMaterial({ map: tex });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
    });
  }, 15000);

  test('step4: textured cube WITHOUT SRGBColorSpace', async () => {
    await setupScene(tsyneTest, 'step4-no-srgb', async (THREE, scene, camera, renderer) => {
      const texPath = path.join(__dirname, 'src/static/textures/block/grass_top_green.png');
      const tex = await loadTexture(THREE, texPath);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      // no colorSpace set

      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshPhongMaterial({ map: tex });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
    });
  }, 15000);

  test('step5: InstancedMesh with texture (3 blocks)', async () => {
    await setupScene(tsyneTest, 'step5-instanced', async (THREE, scene, camera, renderer) => {
      const texPath = path.join(__dirname, 'src/static/textures/block/grass_top_green.png');
      const tex = await loadTexture(THREE, texPath);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;

      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshPhongMaterial({ map: tex });
      const instanced = new THREE.InstancedMesh(geo, mat, 3);

      const matrix = new THREE.Matrix4();
      matrix.setPosition(-1.5, 0, 0);
      instanced.setMatrixAt(0, matrix);
      matrix.setPosition(0, 0, 0);
      instanced.setMatrixAt(1, matrix);
      matrix.setPosition(1.5, 0, 0);
      instanced.setMatrixAt(2, matrix);
      instanced.instanceMatrix.needsUpdate = true;

      scene.add(instanced);
    });
  }, 15000);
});
