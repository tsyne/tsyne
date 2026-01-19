#!/usr/bin/env npx tsx
/**
 * Cosyne 3D Demo: Robot Arm
 *
 * Demonstrates:
 * - Hierarchical transforms (forward kinematics)
 * - Reactive bindings for joint rotations
 * - Nested coordinate systems with ctx.transform()
 * - Composite objects (gripper claw)
 * - Slider-driven animation
 *
 * @tsyne-app:name Robot Arm
 * @tsyne-app:icon viewRefresh
 * @tsyne-app:category Demos
 * @tsyne-app:args (a: App) => void
 */

import { app, resolveTransport } from '../../core/src/index';
import { cosyne3d, renderer3d, createRenderTarget, RenderTarget } from '../../cosyne/src/index3d';

// Robot State (Reactive)
const robotState = {
  baseRotation: 0,        // Y-axis rotation of turret (0 to 2*PI)
  shoulderAngle: -0.3,    // X-axis rotation of shoulder (-PI/2 to PI/2)
  elbowAngle: 0.6,        // X-axis rotation of elbow (-PI to PI/2)
  clawOpen: 0.3,          // Claw opening amount (0 to 1)
};

// Camera State for Orbiting
const cameraState = {
  radius: 30,
  theta: Math.PI / 4,     // Azimuth angle
  phi: Math.PI / 3,       // Elevation angle
  lookAt: [0, 6, 0] as [number, number, number],
};

export function buildRobotArmApp(a: any) {
  a.window({ title: 'Robot Arm Kinematics', width: 900, height: 700 }, (win: any) => {
    const WIDTH = 900;
    const HEIGHT = 550;

    // Create reusable render target for performance
    const renderTarget: RenderTarget = createRenderTarget(WIDTH, HEIGHT);

    // Canvas reference for animation updates
    let canvas: any = null;

    // Build the 3D scene
    const scene = cosyne3d(a, (ctx) => {
      // Camera with orbit binding
      ctx.setCamera({ fov: 50, lookAt: cameraState.lookAt })
        .bindPosition(() => {
          const x = cameraState.radius * Math.sin(cameraState.phi) * Math.cos(cameraState.theta);
          const z = cameraState.radius * Math.sin(cameraState.phi) * Math.sin(cameraState.theta);
          const y = cameraState.radius * Math.cos(cameraState.phi);
          return [x, y, z];
        });

      // Lighting
      ctx.light({ type: 'ambient', intensity: 0.4 });
      ctx.light({ type: 'directional', direction: [-0.5, -1, -0.5], intensity: 0.7 });
      ctx.light({ type: 'directional', direction: [0.5, -0.5, 0.5], intensity: 0.3 });

      // Ground Plane (checkerboard pattern simulated with boxes)
      const groundSize = 20;
      const tileSize = 2;
      for (let gx = -groundSize / 2; gx < groundSize / 2; gx += tileSize) {
        for (let gz = -groundSize / 2; gz < groundSize / 2; gz += tileSize) {
          const isDark = ((gx / tileSize + gz / tileSize) % 2 === 0);
          ctx.box({
            size: [tileSize - 0.05, 0.1, tileSize - 0.05],
            position: [gx + tileSize / 2, -0.05, gz + tileSize / 2],
          }).setMaterial({ color: isDark ? '#404040' : '#606060' })
            .passthrough(true);  // Don't intercept clicks
        }
      }

      // ============================================================
      // ROBOT ARM HIERARCHY (Forward Kinematics Chain)
      // ============================================================
      //
      // Joint Diagram:
      //
      //                    [Finger L]  [Finger R]
      //                         \      /
      //                          \    /
      //                       [Wrist Bar]
      //                            |
      //                       [Forearm]
      //                            |
      //                    (ELBOW JOINT) ← rotates around X-axis
      //                            |
      //                       [Upper Arm]
      //                            |
      //                   (SHOULDER JOINT) ← rotates around X-axis
      //                            |
      //                        [Turret]
      //                            |
      //                     (BASE JOINT) ← rotates around Y-axis
      //                            |
      //                     [Base Platform]
      //                    ═══════════════
      //                       (Ground)
      //
      // ============================================================

      // ──────────────────────────────────────────────────────────────
      // SEGMENT 1: Base Platform (static, bolted to ground)
      // ──────────────────────────────────────────────────────────────
      ctx.cylinder({
        radius: 3,
        height: 1,
        position: [0, 0.5, 0],
      }).setMaterial({ color: '#2a2a2a' });

      // ──────────────────────────────────────────────────────────────
      // JOINT 1: Base Joint (Y-axis rotation) - connects Base → Turret
      // ──────────────────────────────────────────────────────────────
      ctx.transform({ translate: [0, 1, 0] }, () => {

        // SEGMENT 2: Turret (rotates with base joint)
        ctx.box({
          size: [4, 2, 4],
          position: [0, 1, 0],
        }).setMaterial({ color: '#3a3a4a' })
          .bindRotation(() => [0, robotState.baseRotation, 0]);

        // ────────────────────────────────────────────────────────────
        // JOINT 2: Shoulder Joint (X-axis rotation) - connects Turret → Upper Arm
        // ────────────────────────────────────────────────────────────
        ctx.transform({ translate: [0, 2, 0] }, () => {

          // Shoulder joint visual (horizontal cylinder as pivot axle)
          ctx.cylinder({
            radius: 0.8,
            height: 2.5,
            rotation: [0, 0, Math.PI / 2],
          }).setMaterial({ color: '#5a5a6a' })
            .bindRotation(() => [0, robotState.baseRotation, Math.PI / 2]);

          // SEGMENT 3: Upper Arm (rotates with shoulder joint)
          ctx.box({
            size: [1.5, 7, 1.5],
          }).setMaterial({ color: '#6a8a9a' })
            .bindPosition(() => {
              // Arm center is at half-length from shoulder pivot
              const armLength = 7;
              const centerOffset = armLength / 2;
              const angle = robotState.shoulderAngle;
              // Forward kinematics: rotate around X-axis
              const cy = centerOffset * Math.cos(angle);
              const cz = -centerOffset * Math.sin(angle);
              return [0, cy, cz];
            })
            .bindRotation(() => [robotState.shoulderAngle, robotState.baseRotation, 0]);

          // ──────────────────────────────────────────────────────────
          // JOINT 3: Elbow Joint (X-axis rotation) - connects Upper Arm → Forearm
          // ──────────────────────────────────────────────────────────

          // Elbow joint visual (horizontal cylinder as pivot axle)
          ctx.cylinder({
            radius: 0.6,
            height: 2,
            rotation: [0, 0, Math.PI / 2],
          }).setMaterial({ color: '#5a5a6a' })
            .bindPosition(() => {
              // Elbow is at end of upper arm
              const armLength = 7;
              const y = armLength * Math.cos(robotState.shoulderAngle);
              const z = -armLength * Math.sin(robotState.shoulderAngle);
              return [0, y, z];
            })
            .bindRotation(() => [0, robotState.baseRotation, Math.PI / 2]);

          // SEGMENT 4: Forearm (rotates with elbow joint, inherits shoulder rotation)
          ctx.box({
            size: [1.2, 5, 1.2],
          }).setMaterial({ color: '#7a9aaa' })
            .bindPosition(() => {
              const upperArmLength = 7;
              const forearmLength = 5;
              const forearmCenterOffset = forearmLength / 2;

              // Start at elbow position (end of upper arm)
              const elbowY = upperArmLength * Math.cos(robotState.shoulderAngle);
              const elbowZ = -upperArmLength * Math.sin(robotState.shoulderAngle);

              // Combined angle = shoulder + elbow (forward kinematics chain)
              const combinedAngle = robotState.shoulderAngle + robotState.elbowAngle;

              // Forearm center offset from elbow
              const offsetY = forearmCenterOffset * Math.cos(combinedAngle);
              const offsetZ = -forearmCenterOffset * Math.sin(combinedAngle);

              return [0, elbowY + offsetY, elbowZ + offsetZ];
            })
            .bindRotation(() => [
              robotState.shoulderAngle + robotState.elbowAngle,
              robotState.baseRotation,
              0
            ]);

          // ──────────────────────────────────────────────────────────
          // SEGMENT 5: Wrist/Gripper Assembly (at end of forearm)
          // ──────────────────────────────────────────────────────────

          // Wrist bar (connects forearm to fingers)
          ctx.box({
            size: [3, 0.8, 0.8],
          }).setMaterial({ color: '#4a4a5a' })
            .bindPosition(() => {
              const upperArmLength = 7;
              const forearmLength = 5;

              const elbowY = upperArmLength * Math.cos(robotState.shoulderAngle);
              const elbowZ = -upperArmLength * Math.sin(robotState.shoulderAngle);

              const combinedAngle = robotState.shoulderAngle + robotState.elbowAngle;
              const wristY = elbowY + forearmLength * Math.cos(combinedAngle);
              const wristZ = elbowZ - forearmLength * Math.sin(combinedAngle);

              return [0, wristY, wristZ];
            })
            .bindRotation(() => [
              robotState.shoulderAngle + robotState.elbowAngle,
              robotState.baseRotation,
              0
            ]);

          // ──────────────────────────────────────────────────────────
          // JOINT 4: Gripper Joint (linear actuator) - opens/closes fingers
          // ──────────────────────────────────────────────────────────

          // Left Finger (moves laterally based on clawOpen)
          ctx.box({
            size: [0.4, 2.5, 0.4],
          }).setMaterial({ color: '#8a8a9a' })
            .bindPosition(() => {
              const upperArmLength = 7;
              const forearmLength = 5;

              const elbowY = upperArmLength * Math.cos(robotState.shoulderAngle);
              const elbowZ = -upperArmLength * Math.sin(robotState.shoulderAngle);

              const combinedAngle = robotState.shoulderAngle + robotState.elbowAngle;
              const wristY = elbowY + forearmLength * Math.cos(combinedAngle);
              const wristZ = elbowZ - forearmLength * Math.sin(combinedAngle);

              // Finger lateral offset controlled by clawOpen (0=closed, 1=open)
              const fingerOffset = 1.2 + robotState.clawOpen * 0.8;
              const fingerLength = 2.5;
              const fingerCenterOffset = fingerLength / 2;

              // Finger extends in arm direction from wrist
              const fingerY = wristY + fingerCenterOffset * Math.cos(combinedAngle);
              const fingerZ = wristZ - fingerCenterOffset * Math.sin(combinedAngle);

              // Apply base rotation to lateral offset
              const localX = -fingerOffset;
              const worldX = localX * Math.cos(robotState.baseRotation);
              const worldZ = localX * Math.sin(robotState.baseRotation);

              return [worldX, fingerY, fingerZ + worldZ];
            })
            .bindRotation(() => [
              robotState.shoulderAngle + robotState.elbowAngle,
              robotState.baseRotation,
              0
            ]);

          // Right Finger (moves laterally based on clawOpen)
          ctx.box({
            size: [0.4, 2.5, 0.4],
          }).setMaterial({ color: '#8a8a9a' })
            .bindPosition(() => {
              const upperArmLength = 7;
              const forearmLength = 5;

              const elbowY = upperArmLength * Math.cos(robotState.shoulderAngle);
              const elbowZ = -upperArmLength * Math.sin(robotState.shoulderAngle);

              const combinedAngle = robotState.shoulderAngle + robotState.elbowAngle;
              const wristY = elbowY + forearmLength * Math.cos(combinedAngle);
              const wristZ = elbowZ - forearmLength * Math.sin(combinedAngle);

              // Finger lateral offset (opposite side from left finger)
              const fingerOffset = 1.2 + robotState.clawOpen * 0.8;
              const fingerLength = 2.5;
              const fingerCenterOffset = fingerLength / 2;

              const fingerY = wristY + fingerCenterOffset * Math.cos(combinedAngle);
              const fingerZ = wristZ - fingerCenterOffset * Math.sin(combinedAngle);

              const localX = fingerOffset;  // Positive X = right side
              const worldX = localX * Math.cos(robotState.baseRotation);
              const worldZ = localX * Math.sin(robotState.baseRotation);

              return [worldX, fingerY, fingerZ + worldZ];
            })
            .bindRotation(() => [
              robotState.shoulderAngle + robotState.elbowAngle,
              robotState.baseRotation,
              0
            ]);
        });
      });

    }, {
      width: WIDTH,
      height: HEIGHT,
      backgroundColor: '#1a1a2e',
    });

    // Render frame to buffer and update canvas
    const renderFrame = async () => {
      if (!canvas) return;
      scene.refreshBindings();
      const pixels = renderer3d.renderToBuffer(scene, renderTarget);
      await canvas.setPixelBuffer(pixels);
    };

    // Build content once
    win.setContent(() => {
      a.vbox(() => {
        // 3D Scene Canvas
        a.max(() => {
          canvas = a.tappableCanvasRaster(WIDTH, HEIGHT, {
            onDrag: (x: any, y: any, deltaX: any, deltaY: any) => {
              const sensitivity = 0.01;
              cameraState.theta -= deltaX * sensitivity;
              cameraState.phi -= deltaY * sensitivity;

              const epsilon = 0.1;
              cameraState.phi = Math.max(epsilon, Math.min(Math.PI - epsilon, cameraState.phi));

              renderFrame();
            },
            onScroll: (dx: any, dy: any) => {
              const zoomSpeed = 0.05;
              const factor = 1 + (dy > 0 ? 1 : -1) * zoomSpeed;
              cameraState.radius *= factor;
              cameraState.radius = Math.max(10, Math.min(100, cameraState.radius));

              renderFrame();
            }
          });
        });

        a.separator();

        // Control Panel
        a.hbox(() => {
          // Base Rotation
          a.vbox(() => {
            a.label('Base Rotation');
            a.slider(0, Math.PI * 2, robotState.baseRotation, (val: number) => {
              robotState.baseRotation = val;
              renderFrame();
            }).withId('sliderBase');
          });

          a.spacer();

          // Shoulder Angle
          a.vbox(() => {
            a.label('Shoulder');
            a.slider(-Math.PI / 2, Math.PI / 2, robotState.shoulderAngle, (val: number) => {
              robotState.shoulderAngle = val;
              renderFrame();
            }).withId('sliderShoulder');
          });

          a.spacer();

          // Elbow Angle
          a.vbox(() => {
            a.label('Elbow');
            a.slider(-Math.PI / 2, Math.PI / 2, robotState.elbowAngle, (val: number) => {
              robotState.elbowAngle = val;
              renderFrame();
            }).withId('sliderElbow');
          });

          a.spacer();

          // Claw Open/Close
          a.vbox(() => {
            a.label('Gripper');
            a.slider(0, 1, robotState.clawOpen, (val: number) => {
              robotState.clawOpen = val;
              renderFrame();
            }).withId('sliderClaw');
          });

          a.spacer();

          // Reset Button
          a.button('Reset').onClick(() => {
            robotState.baseRotation = 0;
            robotState.shoulderAngle = -0.3;
            robotState.elbowAngle = 0.6;
            robotState.clawOpen = 0.3;
            cameraState.radius = 30;
            cameraState.theta = Math.PI / 4;
            cameraState.phi = Math.PI / 3;
            renderFrame();
          }).withId('resetBtn');
        });
      });
    });

    win.show();

    // Initial render after a short delay
    setTimeout(() => renderFrame(), 100);
  });
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Robot Arm' }, buildRobotArmApp);
}
