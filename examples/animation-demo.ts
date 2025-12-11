/**
 * Animation Demo - Demonstrates Tsyne's built-in D3-style animation API
 *
 * @tsyne-app:name Animation Demo
 * @tsyne-app:builder default
 *
 * Shows various animation capabilities using the built-in .to() method:
 * - Position animations (x, y, x2, y2)
 * - Different easing functions (linear, inOut, elastic, bounce)
 * - Chained animations
 * - Animation callbacks
 *
 * Run with: npx ts-node examples/animation-demo.ts
 * Or headed: TSYNE_HEADED=1 npx ts-node examples/animation-demo.ts
 */

import { app } from '../src';
import { CanvasCircle, CanvasLine, AnimateOptions } from '../src/widgets/canvas';

// Main app
export function buildAnimationDemo(a: any) {
  a.window({ title: 'Animation Demo', width: 600, height: 500 }, (win: any) => {
    // Store canvas objects for animation
    let circle1: CanvasCircle;
    let circle2: CanvasCircle;
    let circle3: CanvasCircle;
    let circle4: CanvasCircle;
    let line1: CanvasLine;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Animation API Demo').withId('title');
        a.label('Click "Run All" to see animations');

        a.stack(() => {
          // Background
          a.canvasRectangle({
            width: 580, height: 350,
            fillColor: '#f8f8f8',
            strokeColor: '#cccccc',
            strokeWidth: 1
          });

          // Demo 1: Position animation (circle moves right) - inOut easing
          circle1 = a.canvasCircle({
            x: 20, y: 20,
            x2: 60, y2: 60,
            fillColor: '#3498DB'
          });
          a.canvasText('1. Position (inOut)', { x: 20, y: 70, color: '#333333', textSize: 12 });

          // Demo 2: Linear easing
          circle2 = a.canvasCircle({
            x: 20, y: 90,
            x2: 60, y2: 130,
            fillColor: '#E74C3C'
          });
          a.canvasText('2. Linear', { x: 20, y: 140, color: '#333333', textSize: 12 });

          // Demo 3: Elastic easing
          circle3 = a.canvasCircle({
            x: 20, y: 160,
            x2: 60, y2: 200,
            fillColor: '#2ECC71'
          });
          a.canvasText('3. Elastic', { x: 20, y: 210, color: '#333333', textSize: 12 });

          // Demo 4: Bounce easing
          circle4 = a.canvasCircle({
            x: 20, y: 230,
            x2: 60, y2: 270,
            fillColor: '#9B59B6'
          });
          a.canvasText('4. Bounce', { x: 20, y: 280, color: '#333333', textSize: 12 });

          // Demo 5: Line animation
          line1 = a.canvasLine(20, 310, 60, 310, {
            strokeColor: '#F39C12',
            strokeWidth: 4
          });
          a.canvasText('5. Line', { x: 20, y: 330, color: '#333333', textSize: 12 });
        });

        a.hbox(() => {
          a.button('Run All').onClick(() => {
            console.log('Running all animations...');

            // 1. Position: move right with default inOut easing
            circle1.to({ x: 400, x2: 440 }, 1000);

            // 2. Linear easing - constant speed
            circle2.to({ x: 400, x2: 440 }, { ms: 1000, ease: 'linear' });

            // 3. Elastic easing - springy overshoot
            circle3.to({ x: 400, x2: 440 }, { ms: 1500, ease: 'elastic' });

            // 4. Bounce easing - bounces at end
            circle4.to({ x: 400, x2: 440 }, { ms: 1500, ease: 'bounce' });

            // 5. Line grows with callback
            line1.to({ x2: 500 }, {
              ms: 1000,
              ease: 'inOut',
              onEnd: () => console.log('Line animation complete!')
            });
          }).withId('runAll');

          a.button('Reset').onClick(() => {
            console.log('Resetting positions...');

            // Reset circle positions
            circle1.update({ x: 20, y: 20, x2: 60, y2: 60 });
            circle2.update({ x: 20, y: 90, x2: 60, y2: 130 });
            circle3.update({ x: 20, y: 160, x2: 60, y2: 200 });
            circle4.update({ x: 20, y: 230, x2: 60, y2: 270 });

            // Reset line
            line1.update({ x1: 20, y1: 310, x2: 60, y2: 310 });
          }).withId('reset');

          a.button('Chain Demo').onClick(() => {
            console.log('Running chained animation...');

            // Chained animations: right -> down -> left -> up (square path)
            circle1
              .to({ x: 400, x2: 440 }, 500)
              .to({ y: 230, y2: 270 }, 500)
              .to({ x: 20, x2: 60 }, 500)
              .to({ y: 20, y2: 60 }, { ms: 500, onEnd: () => console.log('Chain complete!') });
          }).withId('chainDemo');
        });
      });
    });
    win.show();
  });
}

// Run standalone
if (require.main === module) {
  app({ title: 'Animation Demo' }, async (a) => {
    buildAnimationDemo(a);
  });
}
