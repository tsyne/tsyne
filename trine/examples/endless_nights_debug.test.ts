/**
 * Minimal debug test - isolate what renders
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { initThreeJS } from '../integration/init';

describe('Endless Nights - minimal debug', () => {
    let tsyneTest: TsyneTest;
    let ctx: TestContext;

    beforeAll(async () => {
        tsyneTest = new TsyneTest({ headed: true });
    });

    afterAll(async () => {
        await tsyneTest?.cleanup();
    });

    it('step1: single plane with BasicMaterial', async () => {
        let running = true;

        const testApp = await tsyneTest.createApp(async (app) => {
            await app.window(
                { title: 'Debug Step 1', width: 400, height: 300 },
                async (win) => {
                    const { THREE } = await initThreeJS(app, win, { width: 400, height: 300 });

                    const scene = new THREE.Scene();
                    const camera = new THREE.PerspectiveCamera(60, 400 / 300, 0.1, 200);
                    camera.position.set(0, 10, 15);
                    camera.lookAt(0, 0, 0);

                    // Simple green plane - MeshBasicMaterial (no lights needed)
                    const planeGeom = new THREE.PlaneGeometry(20, 20);
                    planeGeom.rotateX(-Math.PI / 2);
                    const planeMat = new THREE.MeshBasicMaterial({ color: 0x228B22 });
                    const plane = new THREE.Mesh(planeGeom, planeMat);
                    scene.add(plane);

                    // Red box on the plane
                    const boxGeom = new THREE.BoxGeometry(2, 2, 2);
                    const boxMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                    const box = new THREE.Mesh(boxGeom, boxMat);
                    box.position.y = 1;
                    scene.add(box);

                    const renderer = new THREE.WebGLRenderer({ antialias: true });
                    renderer.setSize(400, 300);

                    const animate = async () => {
                        while (running) {
                            renderer.render(scene, camera);
                            const gl = renderer.getContext();
                            if (gl?.flush) await gl.flush();
                            await new Promise(r => setTimeout(r, 16));
                        }
                    };
                    animate();
                    win.show();
                }
            );
        });

        ctx = tsyneTest.getContext();
        await testApp.run();

        const dir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        await ctx.wait(1500);
        await tsyneTest.screenshot(path.join(dir, 'debug-step1-plane.png'));
        running = false;
    }, 20000);

    it('step2: plane with Lambert + lights', async () => {
        let running = true;

        const testApp = await tsyneTest.createApp(async (app) => {
            await app.window(
                { title: 'Debug Step 2', width: 400, height: 300 },
                async (win) => {
                    const { THREE } = await initThreeJS(app, win, { width: 400, height: 300 });

                    const scene = new THREE.Scene();
                    const camera = new THREE.PerspectiveCamera(60, 400 / 300, 0.1, 200);
                    camera.position.set(0, 10, 15);
                    camera.lookAt(0, 0, 0);

                    // Lights
                    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
                    const dir = new THREE.DirectionalLight(0xffffff, 2);
                    dir.position.set(5, 10, 5);
                    scene.add(dir);

                    // Lambert plane
                    const planeGeom = new THREE.PlaneGeometry(20, 20);
                    planeGeom.rotateX(-Math.PI / 2);
                    const planeMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
                    const plane = new THREE.Mesh(planeGeom, planeMat);
                    scene.add(plane);

                    // Lambert box
                    const boxGeom = new THREE.BoxGeometry(2, 2, 2);
                    const boxMat = new THREE.MeshLambertMaterial({ color: 0xff4444 });
                    const box = new THREE.Mesh(boxGeom, boxMat);
                    box.position.y = 1;
                    scene.add(box);

                    const renderer = new THREE.WebGLRenderer({ antialias: true });
                    renderer.setSize(400, 300);

                    const animate = async () => {
                        while (running) {
                            renderer.render(scene, camera);
                            const gl = renderer.getContext();
                            if (gl?.flush) await gl.flush();
                            await new Promise(r => setTimeout(r, 16));
                        }
                    };
                    animate();
                    win.show();
                }
            );
        });

        ctx = tsyneTest.getContext();
        await testApp.run();

        const screenshotDir = path.join(__dirname, 'screenshots');
        await ctx.wait(1500);
        await tsyneTest.screenshot(path.join(screenshotDir, 'debug-step2-lambert.png'));
        running = false;
    }, 20000);

    it('step3: plane with Lambert + vertexColors', async () => {
        let running = true;

        const testApp = await tsyneTest.createApp(async (app) => {
            await app.window(
                { title: 'Debug Step 3', width: 400, height: 300 },
                async (win) => {
                    const { THREE } = await initThreeJS(app, win, { width: 400, height: 300 });

                    const scene = new THREE.Scene();
                    const camera = new THREE.PerspectiveCamera(60, 400 / 300, 0.1, 200);
                    camera.position.set(0, 10, 15);
                    camera.lookAt(0, 0, 0);

                    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
                    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
                    dirLight.position.set(5, 10, 5);
                    scene.add(dirLight);

                    // Plane with vertex colors
                    const planeGeom = new THREE.PlaneGeometry(20, 20, 10, 10);
                    planeGeom.rotateX(-Math.PI / 2);

                    const positions = planeGeom.getAttribute('position');
                    const colors = new Float32Array(positions.count * 3);
                    for (let i = 0; i < positions.count; i++) {
                        colors[i * 3] = 0.2;
                        colors[i * 3 + 1] = 0.5;
                        colors[i * 3 + 2] = 0.15;
                    }
                    planeGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

                    const planeMat = new THREE.MeshLambertMaterial({ vertexColors: true });
                    const plane = new THREE.Mesh(planeGeom, planeMat);
                    scene.add(plane);

                    const renderer = new THREE.WebGLRenderer({ antialias: true });
                    renderer.setSize(400, 300);

                    const animate = async () => {
                        while (running) {
                            renderer.render(scene, camera);
                            const gl = renderer.getContext();
                            if (gl?.flush) await gl.flush();
                            await new Promise(r => setTimeout(r, 16));
                        }
                    };
                    animate();
                    win.show();
                }
            );
        });

        ctx = tsyneTest.getContext();
        await testApp.run();

        const screenshotDir = path.join(__dirname, 'screenshots');
        await ctx.wait(1500);
        await tsyneTest.screenshot(path.join(screenshotDir, 'debug-step3-vertexcolors.png'));
        running = false;
    }, 20000);
});
