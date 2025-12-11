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
  a.window({ title: 'Animation Demo', width: 600, height: 400 }, (win: any) => {
    // Store canvas objects for animations
    let inOutCircle: CanvasCircle;
    let linearCircle: CanvasCircle;
    let elasticCircle: CanvasCircle;
    let bounceCircle: CanvasCircle;
    let line1: CanvasLine;
    let chainCircle: CanvasCircle;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Animation API Demo').withId('title');

        a.tabs([
          // Tab 1: InOut easing (default)
          {
            title: 'InOut',
            builder: () => {
              a.vbox(() => {
                a.label('InOut Easing');
                a.label('Easing: inOut, Duration: 1000ms');

                a.stack(() => {
                  a.canvasRectangle({
                    width: 550, height: 150,
                    fillColor: '#f8f8f8',
                    strokeColor: '#cccccc',
                    strokeWidth: 1
                  });

                  inOutCircle = a.canvasCircle({
                    x: 20, y: 55,
                    x2: 60, y2: 95,
                    fillColor: '#3498DB'
                  });
                });

                a.hbox(() => {
                  a.button('Run').onClick(() => {
                    console.log('Running inOut animation...');
                    inOutCircle.to({ x: 470, x2: 510 }, { ms: 1000, ease: 'inOut' });
                  });

                  a.button('Reset').onClick(() => {
                    inOutCircle.update({ x: 20, y: 55, x2: 60, y2: 95 });
                  });
                });
              });
            }
          },

          // Tab 2: Linear easing
          {
            title: 'Linear',
            builder: () => {
              a.vbox(() => {
                a.label('Linear Easing');
                a.label('Easing: linear, Duration: 1000ms');

                a.stack(() => {
                  a.canvasRectangle({
                    width: 550, height: 150,
                    fillColor: '#f8f8f8',
                    strokeColor: '#cccccc',
                    strokeWidth: 1
                  });

                  linearCircle = a.canvasCircle({
                    x: 20, y: 55,
                    x2: 60, y2: 95,
                    fillColor: '#E74C3C'
                  });
                });

                a.hbox(() => {
                  a.button('Run').onClick(() => {
                    console.log('Running linear animation...');
                    linearCircle.to({ x: 470, x2: 510 }, { ms: 1000, ease: 'linear' });
                  });

                  a.button('Reset').onClick(() => {
                    linearCircle.update({ x: 20, y: 55, x2: 60, y2: 95 });
                  });
                });
              });
            }
          },

          // Tab 3: Elastic easing
          {
            title: 'Elastic',
            builder: () => {
              a.vbox(() => {
                a.label('Elastic Easing');
                a.label('Easing: elastic, Duration: 1500ms');

                a.stack(() => {
                  a.canvasRectangle({
                    width: 550, height: 150,
                    fillColor: '#f8f8f8',
                    strokeColor: '#cccccc',
                    strokeWidth: 1
                  });

                  elasticCircle = a.canvasCircle({
                    x: 20, y: 55,
                    x2: 60, y2: 95,
                    fillColor: '#2ECC71'
                  });
                });

                a.hbox(() => {
                  a.button('Run').onClick(() => {
                    console.log('Running elastic animation...');
                    elasticCircle.to({ x: 470, x2: 510 }, { ms: 1500, ease: 'elastic' });
                  });

                  a.button('Reset').onClick(() => {
                    elasticCircle.update({ x: 20, y: 55, x2: 60, y2: 95 });
                  });
                });
              });
            }
          },

          // Tab 4: Bounce easing
          {
            title: 'Bounce',
            builder: () => {
              a.vbox(() => {
                a.label('Bounce Easing');
                a.label('Easing: bounce, Duration: 1500ms');

                a.stack(() => {
                  a.canvasRectangle({
                    width: 550, height: 150,
                    fillColor: '#f8f8f8',
                    strokeColor: '#cccccc',
                    strokeWidth: 1
                  });

                  bounceCircle = a.canvasCircle({
                    x: 20, y: 55,
                    x2: 60, y2: 95,
                    fillColor: '#9B59B6'
                  });
                });

                a.hbox(() => {
                  a.button('Run').onClick(() => {
                    console.log('Running bounce animation...');
                    bounceCircle.to({ x: 470, x2: 510 }, { ms: 1500, ease: 'bounce' });
                  });

                  a.button('Reset').onClick(() => {
                    bounceCircle.update({ x: 20, y: 55, x2: 60, y2: 95 });
                  });
                });
              });
            }
          },

          // Tab 5: Line animation
          {
            title: 'Line',
            builder: () => {
              a.vbox(() => {
                a.label('Line Animation');
                a.label('Animates the endpoint of a line');

                a.stack(() => {
                  a.canvasRectangle({
                    width: 550, height: 150,
                    fillColor: '#f8f8f8',
                    strokeColor: '#cccccc',
                    strokeWidth: 1
                  });

                  line1 = a.canvasLine(20, 75, 60, 75, {
                    strokeColor: '#F39C12',
                    strokeWidth: 4
                  });
                });

                a.hbox(() => {
                  a.button('Run').onClick(() => {
                    console.log('Running line animation...');
                    line1.to({ x2: 530 }, {
                      ms: 1000,
                      ease: 'inOut',
                      onEnd: () => console.log('Line animation complete!')
                    });
                  }).withId('runAll');

                  a.button('Reset').onClick(() => {
                    line1.update({ x1: 20, y1: 75, x2: 60, y2: 75 });
                  }).withId('reset');
                });
              });
            }
          },

          // Tab 6: Chain animation
          {
            title: 'Chain',
            builder: () => {
              a.vbox(() => {
                a.label('Chained Animation');
                a.label('Circle moves in a square path: right -> down -> left -> up');

                a.stack(() => {
                  a.canvasRectangle({
                    width: 550, height: 200,
                    fillColor: '#f8f8f8',
                    strokeColor: '#cccccc',
                    strokeWidth: 1
                  });

                  chainCircle = a.canvasCircle({
                    x: 20, y: 20,
                    x2: 60, y2: 60,
                    fillColor: '#3498DB'
                  });
                });

                a.hbox(() => {
                  a.button('Run Chain').onClick(() => {
                    console.log('Running chained animation...');
                    chainCircle
                      .to({ x: 470, x2: 510 }, 500)
                      .to({ y: 140, y2: 180 }, 500)
                      .to({ x: 20, x2: 60 }, 500)
                      .to({ y: 20, y2: 60 }, { ms: 500, onEnd: () => console.log('Chain complete!') });
                  }).withId('chainDemo');

                  a.button('Reset').onClick(() => {
                    chainCircle.update({ x: 20, y: 20, x2: 60, y2: 60 });
                  });
                });
              });
            }
          }
        ]);
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
