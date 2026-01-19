/**
 * Unit tests for 3D Clock helper functions
 *
 * These test the pure/isolated functions without needing Tsyne infrastructure.
 */

import {
  timeState,
  cameraState,
  computeSphericalCameraPosition,
  orbitCameraByDragDelta,
  zoomCameraByScrollDelta,
  getHourHandAngle,
  getMinuteHandAngle,
  getSecondHandAngleSmoothWithMilliseconds,
} from './index';

describe('Camera Position Calculations', () => {
  beforeEach(() => {
    // Reset camera state before each test
    cameraState.radius = 20;
    cameraState.theta = Math.PI / 2;
    cameraState.phi = Math.PI / 2;
    cameraState.lookAt = [0, 0, 0];
  });

  test('computeSphericalCameraPosition returns correct position for default state', () => {
    const [x, y, z] = computeSphericalCameraPosition();

    // At phi=π/2 (equator), theta=π/2, radius=20:
    // x = 20 * sin(π/2) * cos(π/2) = 20 * 1 * 0 = 0
    // y = 20 * cos(π/2) = 0
    // z = 20 * sin(π/2) * sin(π/2) = 20 * 1 * 1 = 20
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(20, 5);
  });

  test('computeSphericalCameraPosition with theta=0 looks along +X', () => {
    cameraState.theta = 0;
    const [x, y, z] = computeSphericalCameraPosition();

    // At phi=π/2, theta=0, radius=20:
    // x = 20 * sin(π/2) * cos(0) = 20 * 1 * 1 = 20
    // y = 20 * cos(π/2) = 0
    // z = 20 * sin(π/2) * sin(0) = 0
    expect(x).toBeCloseTo(20, 5);
    expect(y).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(0, 5);
  });

  test('computeSphericalCameraPosition with phi=0 looks from top', () => {
    cameraState.phi = 0.001; // Near top (can't be exactly 0)
    const [x, y, z] = computeSphericalCameraPosition();

    // At phi≈0, camera is nearly at the top (y ≈ radius)
    expect(y).toBeCloseTo(20, 1);
    expect(Math.abs(x)).toBeLessThan(1);
    expect(Math.abs(z)).toBeLessThan(1);
  });

  test('radius affects camera distance', () => {
    cameraState.radius = 50;
    const [x, y, z] = computeSphericalCameraPosition();
    const distance = Math.sqrt(x * x + y * y + z * z);
    expect(distance).toBeCloseTo(50, 5);
  });
});

describe('Camera Orbit Controls', () => {
  beforeEach(() => {
    cameraState.radius = 20;
    cameraState.theta = Math.PI / 2;
    cameraState.phi = Math.PI / 2;
    cameraState.lookAt = [0, 0, 0];
  });

  test('orbitCameraByDragDelta changes theta with horizontal drag', () => {
    const initialTheta = cameraState.theta;
    orbitCameraByDragDelta(100, 0); // drag right

    expect(cameraState.theta).toBeLessThan(initialTheta);
    expect(cameraState.phi).toBeCloseTo(Math.PI / 2, 5); // phi unchanged
  });

  test('orbitCameraByDragDelta changes phi with vertical drag', () => {
    const initialPhi = cameraState.phi;
    orbitCameraByDragDelta(0, 100); // drag down

    expect(cameraState.phi).toBeLessThan(initialPhi);
    expect(cameraState.theta).toBeCloseTo(Math.PI / 2, 5); // theta unchanged
  });

  test('orbitCameraByDragDelta clamps phi to avoid poles', () => {
    // Drag way up - phi should be clamped to near π
    orbitCameraByDragDelta(0, -10000);
    expect(cameraState.phi).toBeLessThan(Math.PI);
    expect(cameraState.phi).toBeGreaterThan(Math.PI - 0.2);

    // Reset and drag way down - phi should be clamped to near 0
    cameraState.phi = Math.PI / 2;
    orbitCameraByDragDelta(0, 10000);
    expect(cameraState.phi).toBeGreaterThan(0);
    expect(cameraState.phi).toBeLessThan(0.2);
  });
});

describe('Camera Zoom Controls', () => {
  beforeEach(() => {
    cameraState.radius = 20;
  });

  test('zoomCameraByScrollDelta increases radius on scroll down', () => {
    const initialRadius = cameraState.radius;
    zoomCameraByScrollDelta(100); // scroll down = zoom out

    expect(cameraState.radius).toBeGreaterThan(initialRadius);
  });

  test('zoomCameraByScrollDelta decreases radius on scroll up', () => {
    const initialRadius = cameraState.radius;
    zoomCameraByScrollDelta(-100); // scroll up = zoom in

    expect(cameraState.radius).toBeLessThan(initialRadius);
  });

  test('zoomCameraByScrollDelta clamps radius to minimum', () => {
    // Zoom way in
    for (let i = 0; i < 100; i++) {
      zoomCameraByScrollDelta(-1000);
    }
    expect(cameraState.radius).toBeGreaterThanOrEqual(2);
  });

  test('zoomCameraByScrollDelta clamps radius to maximum', () => {
    // Zoom way out
    for (let i = 0; i < 100; i++) {
      zoomCameraByScrollDelta(1000);
    }
    expect(cameraState.radius).toBeLessThanOrEqual(100);
  });
});

describe('Clock Hand Angle Calculations', () => {
  test('getHourHandAngle at 12:00 returns 0', () => {
    timeState.now = new Date(2024, 0, 1, 12, 0, 0, 0);
    expect(getHourHandAngle()).toBeCloseTo(0, 5);
  });

  test('getHourHandAngle at 3:00 returns π/2 (quarter turn)', () => {
    timeState.now = new Date(2024, 0, 1, 3, 0, 0, 0);
    expect(getHourHandAngle()).toBeCloseTo(Math.PI / 2, 5);
  });

  test('getHourHandAngle at 6:00 returns π (half turn)', () => {
    timeState.now = new Date(2024, 0, 1, 6, 0, 0, 0);
    expect(getHourHandAngle()).toBeCloseTo(Math.PI, 5);
  });

  test('getHourHandAngle at 9:00 returns 3π/2', () => {
    timeState.now = new Date(2024, 0, 1, 9, 0, 0, 0);
    expect(getHourHandAngle()).toBeCloseTo(3 * Math.PI / 2, 5);
  });

  test('getHourHandAngle includes minute contribution', () => {
    // At 12:30, hour hand should be halfway between 12 and 1
    timeState.now = new Date(2024, 0, 1, 12, 30, 0, 0);
    const expectedAngle = (0.5 / 12) * Math.PI * 2; // 0.5 hours worth of rotation
    expect(getHourHandAngle()).toBeCloseTo(expectedAngle, 5);
  });

  test('getMinuteHandAngle at :00 returns 0', () => {
    timeState.now = new Date(2024, 0, 1, 12, 0, 0, 0);
    expect(getMinuteHandAngle()).toBeCloseTo(0, 5);
  });

  test('getMinuteHandAngle at :15 returns π/2', () => {
    timeState.now = new Date(2024, 0, 1, 12, 15, 0, 0);
    expect(getMinuteHandAngle()).toBeCloseTo(Math.PI / 2, 5);
  });

  test('getMinuteHandAngle at :30 returns π', () => {
    timeState.now = new Date(2024, 0, 1, 12, 30, 0, 0);
    expect(getMinuteHandAngle()).toBeCloseTo(Math.PI, 5);
  });

  test('getMinuteHandAngle includes second contribution', () => {
    // At :00:30, minute hand should be halfway between 0 and 1
    timeState.now = new Date(2024, 0, 1, 12, 0, 30, 0);
    const expectedAngle = (0.5 / 60) * Math.PI * 2; // 0.5 minutes worth of rotation
    expect(getMinuteHandAngle()).toBeCloseTo(expectedAngle, 5);
  });

  test('getSecondHandAngleSmoothWithMilliseconds at :00 returns 0', () => {
    timeState.now = new Date(2024, 0, 1, 12, 0, 0, 0);
    expect(getSecondHandAngleSmoothWithMilliseconds()).toBeCloseTo(0, 5);
  });

  test('getSecondHandAngleSmoothWithMilliseconds at :15 returns π/2', () => {
    timeState.now = new Date(2024, 0, 1, 12, 0, 15, 0);
    expect(getSecondHandAngleSmoothWithMilliseconds()).toBeCloseTo(Math.PI / 2, 5);
  });

  test('getSecondHandAngleSmoothWithMilliseconds includes millisecond contribution', () => {
    // At :00.500, second hand should be halfway between 0 and 1
    timeState.now = new Date(2024, 0, 1, 12, 0, 0, 500);
    const expectedAngle = (0.5 / 60) * Math.PI * 2; // 0.5 seconds worth of rotation
    expect(getSecondHandAngleSmoothWithMilliseconds()).toBeCloseTo(expectedAngle, 5);
  });

  test('15 seconds equals 90 degrees (π/2)', () => {
    timeState.now = new Date(2024, 0, 1, 12, 0, 0, 0);
    const angle1 = getSecondHandAngleSmoothWithMilliseconds();

    timeState.now = new Date(2024, 0, 1, 12, 0, 15, 0);
    const angle2 = getSecondHandAngleSmoothWithMilliseconds();

    expect(angle2 - angle1).toBeCloseTo(Math.PI / 2, 5);
  });
});
