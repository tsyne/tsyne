#!/usr/bin/env npx tsx
/**
 * Canvas Sphere Animation Demo - Phase 6
 *
 * Interactive demo showcasing all animation presets with controls:
 * - Spin: Continuous rotation around an axis
 * - Wobble: Oscillating rotation back and forth
 * - Bounce: Size oscillation (elastic bounce feel)
 * - Pulse: Smooth size oscillation (breathing effect)
 *
 * Features:
 * - Start/Stop/Pause/Resume controls
 * - Speed adjustment slider
 * - Axis selection for spin/wobble
 * - Amplitude control for wobble/bounce/pulse
 */

import { app, resolveTransport } from '../core/src/index';
import { CanvasSphere, SphereAnimationHandle } from '../core/src/widgets';

interface AnimatedSphereState {
  sphere: CanvasSphere;
  handle: SphereAnimationHandle | null;
  animationType: 'spin' | 'wobble' | 'bounce' | 'pulse';
  speed: number;
  axis: 'x' | 'y' | 'z';
  amplitude: number;
}

app(resolveTransport(), { title: 'Canvas Sphere Animations' }, (a) => {
  a.window({ title: 'Canvas Sphere - Animation Presets (Phase 6)', width: 900, height: 800 }, (win) => {
    win.setContent(() => {
      a.scroll(() => {
        a.vbox(() => {
          // Header
          a.label('Canvas Sphere Animation Presets');
          a.label('Phase 6: Four animation types with interactive controls');
          a.separator();

          // ==================== ANIMATION TYPE 1: SPIN ====================
          a.label('1. Spin Animation');
          a.label('Continuous rotation around an axis (X, Y, or Z)');

          let spinState: AnimatedSphereState;
          a.hbox(() => {
            // Sphere canvas area
            a.vbox(() => {
              spinState = {
                sphere: a.canvasSphere({
                  cx: 150,
                  cy: 150,
                  radius: 80,
                  pattern: 'checkered',
                  latBands: 8,
                  lonSegments: 8,
                  checkeredColor1: '#cc0000',
                  checkeredColor2: '#ffffff',
                }),
                handle: null,
                animationType: 'spin',
                speed: 1.0,
                axis: 'y',
                amplitude: 0,
              };
            });

            a.spacer(20);

            // Controls
            a.vbox(() => {
              a.hbox(() => {
                a.button('Start').onClick(() => {
                  if (spinState.handle) spinState.handle.stop();
                  spinState.handle = spinState.sphere.animate({
                    type: 'spin',
                    speed: spinState.speed,
                    axis: spinState.axis,
                  });
                }).withId('spinStart');

                a.button('Stop').onClick(() => {
                  if (spinState.handle) {
                    spinState.handle.stop();
                    spinState.handle = null;
                  }
                }).withId('spinStop');

                a.button('Pause').onClick(() => {
                  if (spinState.handle) spinState.handle.pause();
                }).withId('spinPause');

                a.button('Resume').onClick(() => {
                  if (spinState.handle) spinState.handle.resume();
                }).withId('spinResume');
              });

              a.label('Speed:');
              a.slider(0.1, 5.0, spinState.speed, (val) => {
                spinState.speed = val;
                if (spinState.handle && spinState.handle.isRunning()) {
                  spinState.handle.stop();
                  spinState.handle = spinState.sphere.animate({
                    type: 'spin',
                    speed: val,
                    axis: spinState.axis,
                  });
                }
              }).withId('spinSpeed');

              a.label('Axis:');
              a.radiogroup(['X', 'Y', 'Z'], (selected) => {
                const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
                spinState.axis = axes[selected];
                if (spinState.handle && spinState.handle.isRunning()) {
                  spinState.handle.stop();
                  spinState.handle = spinState.sphere.animate({
                    type: 'spin',
                    speed: spinState.speed,
                    axis: spinState.axis,
                  });
                }
              }).withId('spinAxis');
            });
          });

          a.separator();

          // ==================== ANIMATION TYPE 2: WOBBLE ====================
          a.label('2. Wobble Animation');
          a.label('Oscillating rotation back and forth');

          let wobbleState: AnimatedSphereState;
          a.hbox(() => {
            a.vbox(() => {
              wobbleState = {
                sphere: a.canvasSphere({
                  cx: 150,
                  cy: 150,
                  radius: 80,
                  pattern: 'stripes',
                  stripeColors: ['#00ff00', '#0000ff', '#ff00ff'],
                  stripeDirection: 'horizontal',
                }),
                handle: null,
                animationType: 'wobble',
                speed: 2.0,
                axis: 'x',
                amplitude: Math.PI / 6,
              };
            });

            a.spacer(20);

            a.vbox(() => {
              a.hbox(() => {
                a.button('Start').onClick(() => {
                  if (wobbleState.handle) wobbleState.handle.stop();
                  wobbleState.handle = wobbleState.sphere.animate({
                    type: 'wobble',
                    speed: wobbleState.speed,
                    axis: wobbleState.axis,
                    amplitude: wobbleState.amplitude,
                  });
                }).withId('wobbleStart');

                a.button('Stop').onClick(() => {
                  if (wobbleState.handle) {
                    wobbleState.handle.stop();
                    wobbleState.handle = null;
                  }
                }).withId('wobbleStop');

                a.button('Pause').onClick(() => {
                  if (wobbleState.handle) wobbleState.handle.pause();
                }).withId('wobblePause');

                a.button('Resume').onClick(() => {
                  if (wobbleState.handle) wobbleState.handle.resume();
                }).withId('wobbleResume');
              });

              a.label('Speed:');
              a.slider(0.5, 5.0, wobbleState.speed, (val) => {
                wobbleState.speed = val;
              }).withId('wobbleSpeed');

              a.label('Amplitude (degrees):');
              a.slider(5, 90, wobbleState.amplitude * 180 / Math.PI, (val) => {
                wobbleState.amplitude = val * Math.PI / 180;
              }).withId('wobbleAmplitude');

              a.label('Axis:');
              a.radiogroup(['X', 'Y', 'Z'], (selected) => {
                const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
                wobbleState.axis = axes[selected];
              }).withId('wobbleAxis');
            });
          });

          a.separator();

          // ==================== ANIMATION TYPE 3: BOUNCE ====================
          a.label('3. Bounce Animation');
          a.label('Size oscillation with elastic bounce feel');

          let bounceState: AnimatedSphereState;
          a.hbox(() => {
            a.vbox(() => {
              bounceState = {
                sphere: a.canvasSphere({
                  cx: 150,
                  cy: 150,
                  radius: 80,
                  pattern: 'gradient',
                  gradientStart: '#ff6600',
                  gradientEnd: '#ffff00',
                }),
                handle: null,
                animationType: 'bounce',
                speed: 2.0,
                axis: 'y',
                amplitude: 0.15,
              };
            });

            a.spacer(20);

            a.vbox(() => {
              a.hbox(() => {
                a.button('Start').onClick(() => {
                  if (bounceState.handle) bounceState.handle.stop();
                  bounceState.handle = bounceState.sphere.animate({
                    type: 'bounce',
                    speed: bounceState.speed,
                    amplitude: bounceState.amplitude,
                  });
                }).withId('bounceStart');

                a.button('Stop').onClick(() => {
                  if (bounceState.handle) {
                    bounceState.handle.stop();
                    bounceState.handle = null;
                  }
                }).withId('bounceStop');

                a.button('Pause').onClick(() => {
                  if (bounceState.handle) bounceState.handle.pause();
                }).withId('bouncePause');

                a.button('Resume').onClick(() => {
                  if (bounceState.handle) bounceState.handle.resume();
                }).withId('bounceResume');
              });

              a.label('Speed:');
              a.slider(0.5, 5.0, bounceState.speed, (val) => {
                bounceState.speed = val;
              }).withId('bounceSpeed');

              a.label('Amplitude (%):');
              a.slider(5, 50, bounceState.amplitude * 100, (val) => {
                bounceState.amplitude = val / 100;
              }).withId('bounceAmplitude');
            });
          });

          a.separator();

          // ==================== ANIMATION TYPE 4: PULSE ====================
          a.label('4. Pulse Animation');
          a.label('Smooth size oscillation (breathing effect)');

          let pulseState: AnimatedSphereState;
          a.hbox(() => {
            a.vbox(() => {
              pulseState = {
                sphere: a.canvasSphere({
                  cx: 150,
                  cy: 150,
                  radius: 80,
                  pattern: 'solid',
                  solidColor: '#ff00ff',
                }),
                handle: null,
                animationType: 'pulse',
                speed: 0.5,
                axis: 'y',
                amplitude: 0.1,
              };
            });

            a.spacer(20);

            a.vbox(() => {
              a.hbox(() => {
                a.button('Start').onClick(() => {
                  if (pulseState.handle) pulseState.handle.stop();
                  pulseState.handle = pulseState.sphere.animate({
                    type: 'pulse',
                    speed: pulseState.speed,
                    amplitude: pulseState.amplitude,
                  });
                }).withId('pulseStart');

                a.button('Stop').onClick(() => {
                  if (pulseState.handle) {
                    pulseState.handle.stop();
                    pulseState.handle = null;
                  }
                }).withId('pulseStop');

                a.button('Pause').onClick(() => {
                  if (pulseState.handle) pulseState.handle.pause();
                }).withId('pulsePause');

                a.button('Resume').onClick(() => {
                  if (pulseState.handle) pulseState.handle.resume();
                }).withId('pulseResume');
              });

              a.label('Speed:');
              a.slider(0.1, 3.0, pulseState.speed, (val) => {
                pulseState.speed = val;
              }).withId('pulseSpeed');

              a.label('Amplitude (%):');
              a.slider(2, 30, pulseState.amplitude * 100, (val) => {
                pulseState.amplitude = val / 100;
              }).withId('pulseAmplitude');
            });
          });

          a.separator();

          // ==================== ALL ANIMATIONS SHOWCASE ====================
          a.label('All Animations Running Together');
          a.label('Four spheres with different animation types');

          a.hbox(() => {
            // Spin
            const showcaseSpin = a.canvasSphere({
              cx: 80,
              cy: 80,
              radius: 50,
              pattern: 'checkered',
              checkeredColor1: '#cc0000',
              checkeredColor2: '#ffffff',
            });
            showcaseSpin.animate({ type: 'spin', speed: 1.5 });

            a.spacer(20);

            // Wobble
            const showcaseWobble = a.canvasSphere({
              cx: 80,
              cy: 80,
              radius: 50,
              pattern: 'stripes',
              stripeColors: ['#00ff00', '#0000ff'],
            });
            showcaseWobble.animate({ type: 'wobble', axis: 'x', speed: 2.0 });

            a.spacer(20);

            // Bounce
            const showcaseBounce = a.canvasSphere({
              cx: 80,
              cy: 80,
              radius: 50,
              pattern: 'gradient',
              gradientStart: '#ff6600',
              gradientEnd: '#ffff00',
            });
            showcaseBounce.animate({ type: 'bounce', speed: 2.5, amplitude: 0.2 });

            a.spacer(20);

            // Pulse
            const showcasePulse = a.canvasSphere({
              cx: 80,
              cy: 80,
              radius: 50,
              pattern: 'solid',
              solidColor: '#ff00ff',
            });
            showcasePulse.animate({ type: 'pulse', speed: 0.5, amplitude: 0.12 });
          });

          a.spacer(50);

          // Summary
          a.separator();
          a.label('Animation API Summary:');
          a.label('  sphere.animate({ type, speed?, axis?, amplitude?, loop?, onComplete? })');
          a.label('  sphere.stopAnimation()');
          a.label('  handle.pause() / handle.resume() / handle.stop()');
          a.label('  handle.isRunning() / handle.isPaused()');
          a.label('  sphere.isAnimating() / sphere.getCurrentAnimation()');
        });
      });
    });

    win.show();
  });
});
