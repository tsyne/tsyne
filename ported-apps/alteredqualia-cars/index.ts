/**
 * Cars Demo - 3D Cars Visualization
 *
 * Ported from https://alteredqualia.com/three/examples/webgl_cars.html
 * Original author: AlteredQualia (three.js examples)
 *
 * A simplified 3D cars demo using Cosyne's 3D primitives.
 * Original featured complex car models with reflections and shadows.
 * This port uses box/cylinder primitives for car shapes.
 *
 * Features:
 * - Two drivable cars (blocky 3D representations)
 * - Multiple camera views (1-6 keys)
 * - Day/night cycle (N key)
 * - WASD/Arrow key driving controls
 * - Ground plane with grid
 *
 * Copyright (c) 2025 Paul Hammant
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * @tsyne-app:name Cars
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
 * @tsyne-app:category graphics
 * @tsyne-app:builder createCarsApp
 * @tsyne-app:args app
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, TappableCanvasRaster } from 'tsyne';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

// Car colors
const CAR_COLORS = {
  bugatti: { body: '#1a237e', accent: '#c62828' },  // Dark blue with red
  lamborghini: { body: '#ff6f00', accent: '#000000' },  // Orange with black
};

// Camera view configurations
const CAMERA_VIEWS = [
  { name: 'Overview', distance: 50, height: 30, angle: 0 },
  { name: 'Chase Car 1', distance: 15, height: 5, angle: 0, followCar: 0 },
  { name: 'Chase Car 2', distance: 15, height: 5, angle: 0, followCar: 1 },
  { name: 'Side View', distance: 40, height: 10, angle: Math.PI / 2 },
  { name: 'Top Down', distance: 5, height: 60, angle: 0 },
  { name: 'Low Angle', distance: 30, height: 3, angle: Math.PI / 4 },
];

/**
 * Simple 3D Vector
 */
export class Vec3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  add(v: Vec3): Vec3 {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v: Vec3): Vec3 {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s: number): Vec3 {
    return new Vec3(this.x * s, this.y * s, this.z * s);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): Vec3 {
    const len = this.length();
    if (len === 0) return new Vec3();
    return this.scale(1 / len);
  }

  dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  rotateY(angle: number): Vec3 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vec3(this.x * cos + this.z * sin, this.y, -this.x * sin + this.z * cos);
  }
}

/**
 * Car state
 */
export class Car {
  position: Vec3 = new Vec3();
  rotation: number = 0; // Y-axis rotation
  velocity: number = 0;
  steering: number = 0;
  color: { body: string; accent: string };

  constructor(
    x: number,
    z: number,
    rotation: number,
    color: { body: string; accent: string }
  ) {
    this.position = new Vec3(x, 0, z);
    this.rotation = rotation;
    this.color = color;
  }

  /**
   * Update car physics
   */
  update(throttle: number, steer: number, dt: number): void {
    // Acceleration
    this.velocity += throttle * 20 * dt;
    this.velocity *= 0.98; // Friction

    // Clamp velocity
    this.velocity = Math.max(-15, Math.min(30, this.velocity));

    // Steering (only when moving)
    if (Math.abs(this.velocity) > 0.1) {
      this.steering = steer * 2;
      this.rotation += this.steering * (this.velocity / 30) * dt;
    }

    // Movement
    const forward = new Vec3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
    this.position = this.position.add(forward.scale(this.velocity * dt));

    // Keep on track (simple bounds)
    this.position.x = Math.max(-50, Math.min(50, this.position.x));
    this.position.z = Math.max(-50, Math.min(50, this.position.z));
  }
}

/**
 * Scene state
 */
export class CarsState {
  cars: Car[] = [];
  currentCameraView: number = 0;
  isNight: boolean = false;
  activeCar: number = 0;

  // Input state
  throttle: number = 0;
  steering: number = 0;

  // Camera
  cameraPos: Vec3 = new Vec3(0, 30, 50);
  cameraTarget: Vec3 = new Vec3(0, 0, 0);

  // Rendering
  pixelBuffer: Uint8Array;
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixelBuffer = new Uint8Array(width * height * 4);

    // Create two cars
    this.cars.push(new Car(-5, 0, 0, CAR_COLORS.bugatti));
    this.cars.push(new Car(5, 0, Math.PI, CAR_COLORS.lamborghini));
  }

  /**
   * Switch camera view
   */
  setCamera(viewIndex: number): void {
    this.currentCameraView = viewIndex % CAMERA_VIEWS.length;
  }

  /**
   * Toggle day/night
   */
  toggleNight(): void {
    this.isNight = !this.isNight;
  }

  /**
   * Switch active car
   */
  switchCar(): void {
    this.activeCar = (this.activeCar + 1) % this.cars.length;
  }

  /**
   * Update scene
   */
  update(dt: number): void {
    // Update active car
    this.cars[this.activeCar].update(this.throttle, this.steering, dt);

    // Update camera based on view
    const view = CAMERA_VIEWS[this.currentCameraView];
    if (view.followCar !== undefined) {
      const car = this.cars[view.followCar];
      const behind = new Vec3(0, 0, -view.distance).rotateY(car.rotation);
      this.cameraPos = car.position.add(behind).add(new Vec3(0, view.height, 0));
      this.cameraTarget = car.position;
    } else {
      this.cameraPos = new Vec3(
        Math.sin(view.angle) * view.distance,
        view.height,
        Math.cos(view.angle) * view.distance
      );
      this.cameraTarget = new Vec3(0, 0, 0);
    }
  }

  /**
   * Project 3D point to 2D screen
   */
  project(point: Vec3): { x: number; y: number; z: number } | null {
    // Camera transform
    const viewDir = this.cameraTarget.sub(this.cameraPos).normalize();
    const right = new Vec3(viewDir.z, 0, -viewDir.x).normalize();
    const up = new Vec3(0, 1, 0);

    // Transform point to camera space
    const relative = point.sub(this.cameraPos);
    const cz = relative.dot(viewDir);

    // Behind camera
    if (cz < 0.1) return null;

    const cx = relative.dot(right);
    const cy = -relative.dot(up);

    // Perspective projection
    const fov = 60;
    const scale = (this.height / 2) / Math.tan((fov * Math.PI) / 360);
    const x = this.width / 2 + (cx / cz) * scale;
    const y = this.height / 2 + (cy / cz) * scale;

    return { x, y, z: cz };
  }

  /**
   * Render the scene
   */
  render(): void {
    // Clear buffer
    const bgColor = this.isNight ? [10, 10, 30] : [135, 206, 235];
    for (let i = 0; i < this.pixelBuffer.length; i += 4) {
      this.pixelBuffer[i] = bgColor[0];
      this.pixelBuffer[i + 1] = bgColor[1];
      this.pixelBuffer[i + 2] = bgColor[2];
      this.pixelBuffer[i + 3] = 255;
    }

    // Draw ground grid
    this.drawGround();

    // Sort cars by distance for proper z-ordering
    const sortedCars = [...this.cars].sort((a, b) => {
      const da = a.position.sub(this.cameraPos).length();
      const db = b.position.sub(this.cameraPos).length();
      return db - da; // Far to near
    });

    // Draw cars
    for (const car of sortedCars) {
      this.drawCar(car);
    }
  }

  /**
   * Draw ground grid
   */
  private drawGround(): void {
    const gridColor = this.isNight ? [30, 30, 50] : [100, 150, 100];
    const gridSize = 50;
    const gridStep = 5;

    // Draw grid lines
    for (let i = -gridSize; i <= gridSize; i += gridStep) {
      // Lines parallel to X
      this.drawLine3D(
        new Vec3(-gridSize, 0, i),
        new Vec3(gridSize, 0, i),
        gridColor
      );
      // Lines parallel to Z
      this.drawLine3D(
        new Vec3(i, 0, -gridSize),
        new Vec3(i, 0, gridSize),
        gridColor
      );
    }
  }

  /**
   * Draw a 3D line
   */
  private drawLine3D(p1: Vec3, p2: Vec3, color: number[]): void {
    const sp1 = this.project(p1);
    const sp2 = this.project(p2);
    if (!sp1 || !sp2) return;

    this.drawLine(
      Math.round(sp1.x),
      Math.round(sp1.y),
      Math.round(sp2.x),
      Math.round(sp2.y),
      color
    );
  }

  /**
   * Draw a 2D line (Bresenham)
   */
  private drawLine(x0: number, y0: number, x1: number, y1: number, color: number[]): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.setPixel(x0, y0, color);

      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /**
   * Draw a car
   */
  private drawCar(car: Car): void {
    // Car dimensions
    const length = 4;
    const width = 2;
    const height = 1.2;
    const wheelRadius = 0.4;

    // Parse car colors
    const bodyColor = this.hexToRgb(car.color.body);
    const accentColor = this.hexToRgb(car.color.accent);
    const wheelColor = [40, 40, 40];

    // Apply lighting
    const lightFactor = this.isNight ? 0.5 : 1.0;
    const litBody = bodyColor.map((c) => Math.floor(c * lightFactor));
    const litAccent = accentColor.map((c) => Math.floor(c * lightFactor));

    // Car body vertices (local space)
    const bodyVerts = [
      // Bottom
      new Vec3(-length / 2, 0, -width / 2),
      new Vec3(length / 2, 0, -width / 2),
      new Vec3(length / 2, 0, width / 2),
      new Vec3(-length / 2, 0, width / 2),
      // Top
      new Vec3(-length / 2 + 0.5, height, -width / 2 + 0.2),
      new Vec3(length / 2 - 0.8, height, -width / 2 + 0.2),
      new Vec3(length / 2 - 0.8, height, width / 2 - 0.2),
      new Vec3(-length / 2 + 0.5, height, width / 2 - 0.2),
    ];

    // Transform vertices to world space
    const worldVerts = bodyVerts.map((v) =>
      v.rotateY(car.rotation).add(car.position)
    );

    // Draw car body (wireframe)
    // Bottom face
    this.drawLine3D(worldVerts[0], worldVerts[1], litBody);
    this.drawLine3D(worldVerts[1], worldVerts[2], litBody);
    this.drawLine3D(worldVerts[2], worldVerts[3], litBody);
    this.drawLine3D(worldVerts[3], worldVerts[0], litBody);

    // Top face
    this.drawLine3D(worldVerts[4], worldVerts[5], litBody);
    this.drawLine3D(worldVerts[5], worldVerts[6], litBody);
    this.drawLine3D(worldVerts[6], worldVerts[7], litBody);
    this.drawLine3D(worldVerts[7], worldVerts[4], litBody);

    // Vertical edges
    this.drawLine3D(worldVerts[0], worldVerts[4], litBody);
    this.drawLine3D(worldVerts[1], worldVerts[5], litBody);
    this.drawLine3D(worldVerts[2], worldVerts[6], litBody);
    this.drawLine3D(worldVerts[3], worldVerts[7], litBody);

    // Wheels (as circles)
    const wheelPositions = [
      new Vec3(-length / 2 + 0.8, wheelRadius, -width / 2 - 0.1),
      new Vec3(-length / 2 + 0.8, wheelRadius, width / 2 + 0.1),
      new Vec3(length / 2 - 0.8, wheelRadius, -width / 2 - 0.1),
      new Vec3(length / 2 - 0.8, wheelRadius, width / 2 + 0.1),
    ];

    for (const wheelPos of wheelPositions) {
      const worldWheel = wheelPos.rotateY(car.rotation).add(car.position);
      this.drawWheel(worldWheel, wheelRadius, car.rotation, wheelColor);
    }

    // Headlights (when night)
    if (this.isNight) {
      const frontLeft = new Vec3(length / 2, 0.5, -width / 2 + 0.3)
        .rotateY(car.rotation)
        .add(car.position);
      const frontRight = new Vec3(length / 2, 0.5, width / 2 - 0.3)
        .rotateY(car.rotation)
        .add(car.position);
      this.drawPoint(frontLeft, [255, 255, 200], 4);
      this.drawPoint(frontRight, [255, 255, 200], 4);
    }

    // Accent stripe
    const stripeStart = new Vec3(-length / 2 + 0.2, height * 0.7, 0)
      .rotateY(car.rotation)
      .add(car.position);
    const stripeEnd = new Vec3(length / 2 - 0.2, height * 0.7, 0)
      .rotateY(car.rotation)
      .add(car.position);
    this.drawLine3D(stripeStart, stripeEnd, litAccent);
  }

  /**
   * Draw a wheel
   */
  private drawWheel(center: Vec3, radius: number, carRotation: number, color: number[]): void {
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;

      // Wheel is perpendicular to car direction
      const p1 = new Vec3(
        center.x + Math.cos(angle1) * radius * Math.cos(carRotation),
        center.y + Math.sin(angle1) * radius,
        center.z + Math.cos(angle1) * radius * Math.sin(carRotation)
      );
      const p2 = new Vec3(
        center.x + Math.cos(angle2) * radius * Math.cos(carRotation),
        center.y + Math.sin(angle2) * radius,
        center.z + Math.cos(angle2) * radius * Math.sin(carRotation)
      );

      this.drawLine3D(p1, p2, color);
    }
  }

  /**
   * Draw a 3D point as a small circle
   */
  private drawPoint(point: Vec3, color: number[], size: number): void {
    const sp = this.project(point);
    if (!sp) return;

    const x = Math.round(sp.x);
    const y = Math.round(sp.y);
    for (let dy = -size; dy <= size; dy++) {
      for (let dx = -size; dx <= size; dx++) {
        if (dx * dx + dy * dy <= size * size) {
          this.setPixel(x + dx, y + dy, color);
        }
      }
    }
  }

  /**
   * Set a pixel in the buffer
   */
  private setPixel(x: number, y: number, color: number[]): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    this.pixelBuffer[idx] = color[0];
    this.pixelBuffer[idx + 1] = color[1];
    this.pixelBuffer[idx + 2] = color[2];
    this.pixelBuffer[idx + 3] = 255;
  }

  /**
   * Convert hex color to RGB array
   */
  private hexToRgb(hex: string): number[] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [128, 128, 128];
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
  }

  /**
   * Get status text
   */
  getStatusText(): string {
    const view = CAMERA_VIEWS[this.currentCameraView];
    const mode = this.isNight ? 'Night' : 'Day';
    const car = this.activeCar === 0 ? 'Bugatti' : 'Lamborghini';
    return `${view.name} | ${mode} | Driving: ${car}`;
  }
}

/**
 * Create the Cars app
 */
export function createCarsApp(a: App): void {
  const state = new CarsState(CANVAS_WIDTH, CANVAS_HEIGHT);
  let canvas: TappableCanvasRaster | null = null;
  let keepRunning = true;

  a.window({ title: 'Cars Demo', width: CANVAS_WIDTH + 40, height: CANVAS_HEIGHT + 120 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Canvas
        a.center(() => {
          canvas = a.tappableCanvasRaster(CANVAS_WIDTH, CANVAS_HEIGHT, {
            onKeyDown: (key: string) => {
              switch (key) {
                case 'Up':
                case 'w':
                case 'W':
                  state.throttle = 1;
                  break;
                case 'Down':
                case 's':
                case 'S':
                  state.throttle = -1;
                  break;
                case 'Left':
                case 'a':
                case 'A':
                  state.steering = -1;
                  break;
                case 'Right':
                case 'd':
                case 'D':
                  state.steering = 1;
                  break;
                case 'n':
                case 'N':
                  state.toggleNight();
                  break;
                case 'Tab':
                  state.switchCar();
                  break;
                case '1':
                  state.setCamera(0);
                  break;
                case '2':
                  state.setCamera(1);
                  break;
                case '3':
                  state.setCamera(2);
                  break;
                case '4':
                  state.setCamera(3);
                  break;
                case '5':
                  state.setCamera(4);
                  break;
                case '6':
                  state.setCamera(5);
                  break;
              }
            },
            onKeyUp: (key: string) => {
              switch (key) {
                case 'Up':
                case 'Down':
                case 'w':
                case 'W':
                case 's':
                case 'S':
                  state.throttle = 0;
                  break;
                case 'Left':
                case 'Right':
                case 'a':
                case 'A':
                case 'd':
                case 'D':
                  state.steering = 0;
                  break;
              }
            },
          });
        });

        // Controls row
        a.hbox(() => {
          a.button('Camera 1').onClick(() => state.setCamera(0));
          a.button('Camera 2').onClick(() => state.setCamera(1));
          a.button('Camera 3').onClick(() => state.setCamera(2));
          a.button('Day/Night').onClick(() => state.toggleNight());
          a.button('Switch Car').onClick(() => state.switchCar());
        });

        // Status
        a.label('WASD/Arrows: Drive | 1-6: Camera | N: Night | Tab: Switch Car');
      });
    });

    win.show();

    // Animation loop
    const animate = async () => {
      const dt = 1 / 60;
      while (keepRunning) {
        state.update(dt);
        state.render();
        if (canvas) {
          await canvas.setPixelBuffer(state.pixelBuffer);
        }
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
    };

    setTimeout(() => animate(), 100);

    win.setCloseIntercept(() => {
      keepRunning = false;
      return true;
    });
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Cars Demo' }, createCarsApp);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
