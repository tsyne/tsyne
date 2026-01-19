import { Camera } from '../src/camera';
import { Vector3 } from '../src/math3d';

describe('Camera Bindings', () => {
  test('bindPosition updates camera position on refresh', () => {
    const camera = new Camera();
    let pos = [0, 0, 10];

    camera.bindPosition(() => [pos[0], pos[1], pos[2]]);
    
    // Initial state
    expect(camera.position.toArray()).toEqual([0, 0, 10]);

    // Update state
    pos = [5, 5, 20];
    camera.refreshBindings();

    expect(camera.position.toArray()).toEqual([5, 5, 20]);
  });

  test('bindLookAt updates camera target on refresh', () => {
    const camera = new Camera();
    let target = [0, 0, 0];

    camera.bindLookAt(() => [target[0], target[1], target[2]]);
    
    expect(camera.target.toArray()).toEqual([0, 0, 0]);

    target = [1, 2, 3];
    camera.refreshBindings();

    expect(camera.target.toArray()).toEqual([1, 2, 3]);
  });

  test('bindUp updates camera up vector on refresh', () => {
    const camera = new Camera();
    let up = [0, 1, 0];

    camera.bindUp(() => [up[0], up[1], up[2]]);
    
    expect(camera.up.toArray()).toEqual([0, 1, 0]);

    up = [1, 0, 0]; // X-up
    camera.refreshBindings();

    expect(camera.up.toArray()).toEqual([1, 0, 0]);
  });

  test('bindFov updates camera field of view on refresh', () => {
    const camera = new Camera({ fov: 60 });
    let fov = 60;

    camera.bindFov(() => fov);
    
    expect(camera.fov).toBe(60);

    fov = 90;
    camera.refreshBindings();

    expect(camera.fov).toBe(90);
  });
});
