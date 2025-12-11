/**
 * Elegant Animation Demo - QML meets D3
 *
 * @tsyne-app:name Elegant Animations
 * @tsyne-app:builder default
 *
 * Demonstrates a terse, declarative animation API inspired by:
 * - QML Behaviors (auto-animate on property change)
 * - D3 transitions (chainable, data-driven)
 * - Spring physics (natural motion)
 *
 * Run with: TSYNE_HEADED=1 npx ts-node examples/animation-elegant.ts
 */

import { app } from '../src';
import { CanvasCircle, CanvasLine, CanvasRectangle, EasingType } from '../src/widgets/canvas';
import { cubicBezier, bezier, EasingFunction, getPointOnBezier } from '../src/animation';

// ============================================================================
// Spring Physics Animation (QML SpringAnimation style)
// ============================================================================

interface SpringConfig {
  stiffness?: number;  // 0-1, higher = snappier (default 0.3)
  damping?: number;    // 0-1, higher = less bounce (default 0.7)
  mass?: number;       // higher = more inertia (default 1)
}

class Spring {
  private target = 0;
  private current = 0;
  private velocity = 0;
  private stiffness: number;
  private damping: number;
  private mass: number;
  private onUpdate: (value: number) => void;
  private running = false;

  constructor(initial: number, onUpdate: (value: number) => void, config: SpringConfig = {}) {
    this.current = initial;
    this.target = initial;
    this.stiffness = config.stiffness ?? 0.3;
    this.damping = config.damping ?? 0.7;
    this.mass = config.mass ?? 1;
    this.onUpdate = onUpdate;
  }

  set(value: number) {
    this.target = value;
    if (!this.running) this.tick();
  }

  private tick = () => {
    const spring = (this.target - this.current) * this.stiffness;
    const damper = -this.velocity * this.damping;
    const accel = (spring + damper) / this.mass;

    this.velocity += accel;
    this.current += this.velocity;

    this.onUpdate(this.current);

    // Stop when settled
    if (Math.abs(this.velocity) < 0.01 && Math.abs(this.target - this.current) < 0.1) {
      this.current = this.target;
      this.velocity = 0;
      this.running = false;
      this.onUpdate(this.current);
    } else {
      this.running = true;
      setTimeout(this.tick, 16);
    }
  };
}

// ============================================================================
// Reactive Property (QML Behavior style) - auto-animate on assignment
// ============================================================================

type BehaviorEase = EasingType | 'spring';

interface BehaviorConfig {
  ms?: number;
  ease?: BehaviorEase;
  spring?: SpringConfig;
}

/**
 * Creates a reactive object that auto-animates property changes.
 * Like QML's Behavior on x { NumberAnimation { duration: 500 } }
 *
 * Usage:
 *   const ball = reactive(circle, { ms: 500, ease: 'elastic' });
 *   ball.x = 100;  // auto-animates!
 */
function reactive<T extends AnimateTarget>(
  target: T,
  config: BehaviorConfig = {}
): { x: number; y: number; x2: number; y2: number } {
  const ms = config.ms ?? 300;
  const ease = config.ease ?? 'inOut';

  // Current animated values
  let state = { x: 0, y: 0, x2: 0, y2: 0 };

  // Springs for spring-based animation
  const springs: Record<string, Spring> = {};

  if (ease === 'spring') {
    const springCfg = config.spring ?? { stiffness: 0.2, damping: 0.7 };
    for (const prop of ['x', 'y', 'x2', 'y2']) {
      springs[prop] = new Spring(state[prop as keyof typeof state], (v) => {
        (target as any).update({ [prop]: v });
      }, springCfg);
    }
  }

  return new Proxy(state, {
    set(obj, prop, value) {
      if (typeof prop === 'string' && prop in obj) {
        if (ease === 'spring' && springs[prop]) {
          springs[prop].set(value);
        } else {
          // Tween animation
          const fromVal = obj[prop as keyof typeof obj];
          (target as any).to({ [prop]: value }, { ms, ease: ease as EasingType });
        }
        obj[prop as keyof typeof obj] = value;
        return true;
      }
      return false;
    }
  });
}

// ============================================================================
// Timeline (D3 keyframes style) - declarative keyframe sequences
// ============================================================================

interface Keyframe {
  at: number;  // time in ms
  props: Record<string, number>;
  ease?: EasingType;
}

/**
 * D3-style keyframe timeline.
 *
 * Usage:
 *   timeline(circle, [
 *     { at: 0,    props: { x: 20 } },
 *     { at: 500,  props: { x: 300 }, ease: 'elastic' },
 *     { at: 1000, props: { x: 20 } }
 *   ]).play();
 */
function timeline(target: AnimateTarget, keyframes: Keyframe[]) {
  return {
    async play(): Promise<void> {
      // Sort by time
      const sorted = [...keyframes].sort((a, b) => a.at - b.at);

      for (let i = 0; i < sorted.length - 1; i++) {
        const from = sorted[i];
        const to = sorted[i + 1];
        const duration = to.at - from.at;
        const ease = to.ease ?? 'inOut';

        await new Promise<void>((resolve) => {
          (target as any).to(to.props, { ms: duration, ease, onEnd: resolve });
        });
      }
    },

    /** Loop the timeline n times (0 = infinite) */
    async loop(n: number = 0): Promise<void> {
      let count = 0;
      while (n === 0 || count < n) {
        await this.play();
        count++;
      }
    }
  };
}

// ============================================================================
// Animation Builder - Fluent API
// ============================================================================

type AnimateTarget = CanvasCircle | CanvasLine | CanvasRectangle;

class AnimationBuilder {
  private target: AnimateTarget;
  private steps: Array<{
    props: Record<string, number>;
    duration: number;
    ease: EasingType;
    delay: number;
  }> = [];

  constructor(target: AnimateTarget) {
    this.target = target;
  }

  /** Animate to values over duration */
  to(props: Record<string, number>, ms: number): this {
    this.steps.push({ props, duration: ms, ease: 'inOut', delay: 0 });
    return this;
  }

  /** Set easing for last step */
  ease(type: EasingType): this {
    if (this.steps.length > 0) {
      this.steps[this.steps.length - 1].ease = type;
    }
    return this;
  }

  /** Add delay before last step */
  delay(ms: number): this {
    if (this.steps.length > 0) {
      this.steps[this.steps.length - 1].delay = ms;
    }
    return this;
  }

  /** Execute the animation chain */
  run(): Promise<void> {
    return new Promise(async (resolve) => {
      for (const step of this.steps) {
        await this.animate(step.props, step.duration, step.ease, step.delay);
      }
      resolve();
    });
  }

  private animate(
    props: Record<string, number>,
    duration: number,
    ease: EasingType,
    delay: number
  ): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        (this.target as any).to(props, { ms: duration, ease, onEnd: resolve });
      }, delay);
    });
  }
}

/** Fluent animation starter */
const animate = (target: AnimateTarget) => new AnimationBuilder(target);

// ============================================================================
// Parallel Animation Helper
// ============================================================================

const parallel = (...animations: Promise<void>[]): Promise<void[]> =>
  Promise.all(animations);

// ============================================================================
// Main Demo
// ============================================================================

// Export tabs object for testing
export let demoTabs: any = null;

export function buildElegantDemo(a: any) {
  a.window({ title: 'Elegant Animations', width: 650, height: 500 }, (win: any) => {
    let springCircle: CanvasCircle;
    let chainCircle: CanvasCircle;
    let parallelCircle1: CanvasCircle;
    let parallelCircle2: CanvasCircle;
    let reactiveCircle: CanvasCircle;
    let timelineCircle: CanvasCircle;
    let bezierCircle: CanvasCircle;
    let ball: { x: number; y: number; x2: number; y2: number };  // reactive proxy
    let springX: Spring;
    let springY: Spring;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Elegant Animation API').withId('title');
        a.label('QML-style declarative + D3-style chaining');

        demoTabs = a.tabs([
          // Tab 1: Spring Physics
          {
            title: 'Spring',
            builder: () => {
              a.vbox(() => {
                a.label('Spring Physics Animation').withId('spring-tab-header');
                a.label('Click canvas or use buttons (ball follows with spring physics)');

                a.stack(() => {
                  // Interactive canvas background - click to move ball!
                  a.canvasRectangle({
                    width: 600, height: 200,
                    fillColor: '#1a1a2e',
                    strokeColor: '#16213e',
                    strokeWidth: 2,
                    onClick: (x: number, y: number) => {
                      // Spring-animate to clicked position (offset by half circle size)
                      springX.set(x - 20);
                      springY.set(y - 20);
                    }
                  });

                  springCircle = a.canvasCircle({
                    x: 280, y: 80,
                    x2: 320, y2: 120,
                    fillColor: '#e94560'
                  });

                  // Setup spring-driven position
                  springX = new Spring(280, (x) => {
                    springCircle.update({ x, x2: x + 40 });
                  }, { stiffness: 0.15, damping: 0.6 });

                  springY = new Spring(80, (y) => {
                    springCircle.update({ y, y2: y + 40 });
                  }, { stiffness: 0.15, damping: 0.6 });
                });

                a.hbox(() => {
                  a.button('Left').onClick(() => {
                    springX.set(20);
                  });
                  a.button('Center').onClick(() => {
                    springX.set(280);
                    springY.set(80);
                  });
                  a.button('Right').onClick(() => {
                    springX.set(540);
                  });
                  a.button('Top').onClick(() => {
                    springY.set(20);
                  });
                  a.button('Bottom').onClick(() => {
                    springY.set(140);
                  });
                  a.button('Bounce!').onClick(() => {
                    springY.set(20);
                    setTimeout(() => springY.set(140), 150);
                    setTimeout(() => springY.set(80), 400);
                  });
                });
              });
            }
          },

          // Tab 2: Fluent Chain
          {
            title: 'Fluent',
            builder: () => {
              a.vbox(() => {
                a.label('Fluent Chainable API').withId('fluent-tab-header');
                a.label('animate(ball).to({x:100}, 500).ease("elastic").run()');

                a.stack(() => {
                  a.canvasRectangle({
                    width: 600, height: 200,
                    fillColor: '#0f3460',
                    strokeColor: '#16213e',
                    strokeWidth: 2
                  });

                  chainCircle = a.canvasCircle({
                    x: 20, y: 80,
                    x2: 60, y2: 120,
                    fillColor: '#00fff5'
                  });
                });

                a.hbox(() => {
                  a.button('Square Path').onClick(async () => {
                    await animate(chainCircle)
                      .to({ x: 520, x2: 560 }, 400).ease('inOut')
                      .to({ y: 140, y2: 180 }, 400).ease('inOut')
                      .to({ x: 20, x2: 60 }, 400).ease('inOut')
                      .to({ y: 80, y2: 120 }, 400).ease('inOut')
                      .run();
                  });

                  a.button('Bounce Across').onClick(async () => {
                    await animate(chainCircle)
                      .to({ x: 520, x2: 560 }, 800).ease('bounce')
                      .run();
                  });

                  a.button('Elastic Return').onClick(async () => {
                    await animate(chainCircle)
                      .to({ x: 520, x2: 560 }, 300).ease('linear')
                      .to({ x: 20, x2: 60 }, 600).ease('elastic')
                      .run();
                  });

                  a.button('Reset').onClick(() => {
                    chainCircle.update({ x: 20, y: 80, x2: 60, y2: 120 });
                  });
                });
              });
            }
          },

          // Tab 3: Parallel
          {
            title: 'Parallel',
            builder: () => {
              a.vbox(() => {
                a.label('Parallel Animations').withId('parallel-tab-header');
                a.label('Multiple objects animating simultaneously');

                a.stack(() => {
                  a.canvasRectangle({
                    width: 600, height: 200,
                    fillColor: '#2d132c',
                    strokeColor: '#801336',
                    strokeWidth: 2
                  });

                  parallelCircle1 = a.canvasCircle({
                    x: 20, y: 30,
                    x2: 60, y2: 70,
                    fillColor: '#ee4540'
                  });

                  parallelCircle2 = a.canvasCircle({
                    x: 20, y: 130,
                    x2: 60, y2: 170,
                    fillColor: '#c72c41'
                  });
                });

                a.hbox(() => {
                  a.button('Race!').onClick(async () => {
                    await parallel(
                      animate(parallelCircle1).to({ x: 520, x2: 560 }, 1000).ease('inOut').run(),
                      animate(parallelCircle2).to({ x: 520, x2: 560 }, 1200).ease('bounce').run()
                    );
                  });

                  a.button('Cross').onClick(async () => {
                    await parallel(
                      animate(parallelCircle1)
                        .to({ x: 520, x2: 560 }, 500)
                        .to({ y: 130, y2: 170 }, 500)
                        .run(),
                      animate(parallelCircle2)
                        .to({ x: 520, x2: 560 }, 500)
                        .to({ y: 30, y2: 70 }, 500)
                        .run()
                    );
                  });

                  a.button('Reset').onClick(() => {
                    parallelCircle1.update({ x: 20, y: 30, x2: 60, y2: 70 });
                    parallelCircle2.update({ x: 20, y: 130, x2: 60, y2: 170 });
                  });
                });
              });
            }
          },

          // Tab 4: Reactive (QML Behavior style)
          {
            title: 'Reactive',
            builder: () => {
              a.vbox(() => {
                a.label('QML-style Reactive Properties').withId('reactive-tab-header');
                a.label('ball.x = 500  // just assign - auto-animates!');

                a.stack(() => {
                  a.canvasRectangle({
                    width: 600, height: 200,
                    fillColor: '#1e3a5f',
                    strokeColor: '#2563eb',
                    strokeWidth: 2
                  });

                  reactiveCircle = a.canvasCircle({
                    x: 20, y: 80,
                    x2: 60, y2: 120,
                    fillColor: '#fbbf24'
                  });

                  // Create reactive wrapper - property assignments auto-animate!
                  ball = reactive(reactiveCircle, { ms: 400, ease: 'elastic' });
                });

                a.hbox(() => {
                  a.button('ball.x = 520').onClick(() => {
                    ball.x = 520;
                    ball.x2 = 560;
                  });
                  a.button('ball.x = 20').onClick(() => {
                    ball.x = 20;
                    ball.x2 = 60;
                  });
                  a.button('ball.y = 140').onClick(() => {
                    ball.y = 140;
                    ball.y2 = 180;
                  });
                  a.button('ball.y = 20').onClick(() => {
                    ball.y = 20;
                    ball.y2 = 60;
                  });
                  a.button('Diagonal').onClick(() => {
                    ball.x = 520; ball.x2 = 560;
                    ball.y = 140; ball.y2 = 180;
                  });
                  a.button('Reset').onClick(() => {
                    ball.x = 20; ball.x2 = 60;
                    ball.y = 80; ball.y2 = 120;
                  });
                });
              });
            }
          },

          // Tab 5: Timeline (D3 keyframes style)
          {
            title: 'Timeline',
            builder: () => {
              a.vbox(() => {
                a.label('D3-style Keyframe Timeline').withId('timeline-tab-header');
                a.label('timeline(ball, [{at:0, ...}, {at:500, ...}]).play()');

                a.stack(() => {
                  a.canvasRectangle({
                    width: 600, height: 200,
                    fillColor: '#3d1a4b',
                    strokeColor: '#9333ea',
                    strokeWidth: 2
                  });

                  timelineCircle = a.canvasCircle({
                    x: 20, y: 80,
                    x2: 60, y2: 120,
                    fillColor: '#a855f7'
                  });
                });

                a.hbox(() => {
                  a.button('Square Path').onClick(() => {
                    timeline(timelineCircle, [
                      { at: 0,    props: { x: 20, x2: 60, y: 80, y2: 120 } },
                      { at: 400,  props: { x: 520, x2: 560 }, ease: 'inOut' },
                      { at: 800,  props: { y: 140, y2: 180 }, ease: 'inOut' },
                      { at: 1200, props: { x: 20, x2: 60 }, ease: 'inOut' },
                      { at: 1600, props: { y: 80, y2: 120 }, ease: 'inOut' }
                    ]).play();
                  });

                  a.button('Bounce').onClick(() => {
                    timeline(timelineCircle, [
                      { at: 0,   props: { y: 80, y2: 120 } },
                      { at: 300, props: { y: 160, y2: 200 }, ease: 'in' },
                      { at: 500, props: { y: 80, y2: 120 }, ease: 'bounce' }
                    ]).play();
                  });

                  a.button('Wave').onClick(() => {
                    timeline(timelineCircle, [
                      { at: 0,    props: { x: 20, x2: 60, y: 100, y2: 140 } },
                      { at: 200,  props: { x: 150, x2: 190, y: 40, y2: 80 }, ease: 'inOut' },
                      { at: 400,  props: { x: 280, x2: 320, y: 160, y2: 200 }, ease: 'inOut' },
                      { at: 600,  props: { x: 410, x2: 450, y: 40, y2: 80 }, ease: 'inOut' },
                      { at: 800,  props: { x: 540, x2: 580, y: 100, y2: 140 }, ease: 'inOut' }
                    ]).play();
                  });

                  a.button('Loop 3x').onClick(() => {
                    timeline(timelineCircle, [
                      { at: 0,   props: { x: 20, x2: 60 } },
                      { at: 400, props: { x: 520, x2: 560 }, ease: 'inOut' },
                      { at: 800, props: { x: 20, x2: 60 }, ease: 'inOut' }
                    ]).loop(3);
                  });

                  a.button('Reset').onClick(() => {
                    timelineCircle.update({ x: 20, y: 80, x2: 60, y2: 120 });
                  });
                });
              });
            }
          },

          // Tab 6: Bezier Curves
          {
            title: 'Bezier',
            builder: () => {
              a.vbox(() => {
                a.label('CSS cubic-bezier() Easing Curves').withId('bezier-tab-header');
                a.label('cubicBezier(x1, y1, x2, y2) or use bezier presets');

                a.stack(() => {
                  a.canvasRectangle({
                    width: 600, height: 200,
                    fillColor: '#1a2f4a',
                    strokeColor: '#3b82f6',
                    strokeWidth: 2
                  });

                  bezierCircle = a.canvasCircle({
                    x: 20, y: 80,
                    x2: 60, y2: 120,
                    fillColor: '#60a5fa'
                  });
                });

                a.hbox(() => {
                  // CSS standard easings
                  a.button('ease').onClick(() => {
                    bezierCircle.to({ x: 520, x2: 560 }, { ms: 800, ease: bezier.ease });
                  });
                  a.button('easeIn').onClick(() => {
                    bezierCircle.to({ x: 520, x2: 560 }, { ms: 800, ease: bezier.easeIn });
                  });
                  a.button('easeOut').onClick(() => {
                    bezierCircle.to({ x: 520, x2: 560 }, { ms: 800, ease: bezier.easeOut });
                  });
                  a.button('easeInOut').onClick(() => {
                    bezierCircle.to({ x: 520, x2: 560 }, { ms: 800, ease: bezier.easeInOut });
                  });
                });

                a.hbox(() => {
                  // Material Design curves
                  a.button('standard').onClick(() => {
                    bezierCircle.to({ x: 520, x2: 560 }, { ms: 800, ease: bezier.standard });
                  });
                  a.button('decelerate').onClick(() => {
                    bezierCircle.to({ x: 520, x2: 560 }, { ms: 800, ease: bezier.decelerate });
                  });
                  a.button('snappy').onClick(() => {
                    bezierCircle.to({ x: 520, x2: 560 }, { ms: 800, ease: bezier.snappy });
                  });
                });

                a.hbox(() => {
                  // Dramatic curves
                  a.button('overshoot').onClick(() => {
                    bezierCircle.to({ x: 520, x2: 560 }, { ms: 800, ease: bezier.overshoot });
                  });
                  a.button('anticipate').onClick(() => {
                    bezierCircle.to({ x: 520, x2: 560 }, { ms: 1000, ease: bezier.anticipate });
                  });
                  a.button('outBack').onClick(() => {
                    bezierCircle.to({ x: 520, x2: 560 }, { ms: 800, ease: bezier.outBack });
                  });
                });

                a.hbox(() => {
                  // Custom bezier
                  a.button('custom(0.7,0,0.3,1)').onClick(() => {
                    const custom = cubicBezier(0.7, 0, 0.3, 1);
                    bezierCircle.to({ x: 520, x2: 560 }, { ms: 800, ease: custom });
                  });
                  a.button('Reset').onClick(() => {
                    bezierCircle.update({ x: 20, y: 80, x2: 60, y2: 120 });
                  });
                });
              });
            }
          },

          // Tab 7: Bezier Path
          {
            title: 'Bezier Path',
            builder: () => {
              a.vbox(() => {
                a.label('Animation along a Bezier Path').withId('bezier-path-tab-header');
                a.label('Animating X and Y concurrently to follow a curve of any degree');

                let pathCircle: CanvasCircle;
                const circleSize = 40;
                const initialPoint = { x: 50, y: 100 };

                const animateOnPath = (points: {x: number, y: number}[]) => {
                  // Reset circle to the start of the path
                  pathCircle.update({
                    x: points[0].x - circleSize / 2, y: points[0].y - circleSize / 2,
                    x2: points[0].x + circleSize / 2, y2: points[0].y + circleSize / 2,
                  });

                  const pathPoints = [];
                  for (let i = 0; i <= 100; i++) {
                    pathPoints.push(getPointOnBezier(points, i / 100));
                  }

                  const duration = 1500;
                  const keyframes: Keyframe[] = pathPoints.map((p, i) => ({
                    at: (i / (pathPoints.length -1)) * duration,
                    props: {
                      x: p.x - circleSize / 2,
                      y: p.y - circleSize / 2,
                      x2: p.x + circleSize / 2,
                      y2: p.y + circleSize / 2,
                    },
                    ease: 'linear'
                  }));

                  if (keyframes.length > 0) {
                    delete keyframes[0].ease;
                  }
                  timeline(pathCircle, keyframes).play();
                }

                a.stack(() => {
                  a.canvasRectangle({
                    width: 600, height: 200,
                    fillColor: '#0f172a',
                    strokeColor: '#1e293b',
                    strokeWidth: 2
                  });

                  // The circle to animate
                  pathCircle = a.canvasCircle({
                    x: initialPoint.x - circleSize / 2, y: initialPoint.y - circleSize / 2,
                    x2: initialPoint.x + circleSize / 2, y2: initialPoint.y + circleSize / 2,
                    fillColor: '#f472b6'
                  });
                });

                a.label('Animate on different curve types:');
                a.hbox(() => {
                  a.button('Linear (2pt)').onClick(() => {
                    const points = [{x: 50, y: 100}, {x: 550, y: 100}];
                    animateOnPath(points);
                  }).withId('bezier-linear-btn');

                  a.button('Quadratic (3pt)').onClick(() => {
                    const points = [{x: 50, y: 150}, {x: 300, y: 20}, {x: 550, y: 150}];
                    animateOnPath(points);
                  }).withId('bezier-quadratic-btn');

                  a.button('Cubic (4pt)').onClick(() => {
                    const points = [{ x: 50, y: 100 }, { x: 200, y: 20 }, { x: 400, y: 180 }, { x: 550, y: 100 }];
                    animateOnPath(points);
                  }).withId('bezier-cubic-btn');

                  a.button('Quartic (5pt)').onClick(() => {
                    const points = [{ x: 50, y: 100 }, { x: 150, y: 20 }, { x: 300, y: 100 }, { x: 450, y: 180 }, { x: 550, y: 100 }];
                    animateOnPath(points);
                  }).withId('bezier-quartic-btn');
                });
              });
            }
          },

          // Tab 8: Code Examples
          {
            title: 'API',
            builder: () => {
              a.vbox(() => {
                a.label('Animation API Reference').withId('api-tab-header');

                a.label('--- Basic Tween ---');
                a.label('circle.to({ x: 100 }, 500)');
                a.label('circle.to({ x: 100, y: 50 }, { ms: 500, ease: "elastic" })');

                a.label('--- Chaining ---');
                a.label('circle.to({x: 100}, 300).to({y: 100}, 300)');

                a.label('--- Fluent Builder ---');
                a.label('animate(circle).to({x: 100}, 500).ease("bounce").run()');

                a.label('--- Spring Physics ---');
                a.label('const spring = new Spring(0, v => circle.x = v)');
                a.label('spring.set(100)  // animates with physics');

                a.label('--- Bezier Curves ---');
                a.label('import { cubicBezier, bezier } from "./animation"');
                a.label('circle.to({x: 100}, { ms: 500, ease: bezier.overshoot })');
                a.label('const custom = cubicBezier(0.68, -0.55, 0.265, 1.55)');

                a.label('--- Easings ---');
                a.label('linear | in | out | inOut | elastic | bounce');
                a.label('bezier.ease | standard | snappy | overshoot | ...');
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
  app({ title: 'Elegant Animations' }, async (a) => {
    buildElegantDemo(a);
  });
}
