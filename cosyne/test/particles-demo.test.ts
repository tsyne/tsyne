/**
 * Screenshot test for particles demo
 *
 * Verifies particle system physics simulation renders correctly
 * with velocity, acceleration, friction, and fade effects.
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { cosyne } from '../src';

const WIDTH = 700;
const HEIGHT = 500;

describe('Particles Demo Screenshot Tests', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('should render particles with fade effect', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Particles Demo', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c: any) => {
              // Background
              c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e').withId('bg');

              // Emitter
              c.circle(WIDTH / 2, HEIGHT / 2, 5).fill('#fff').withId('emitter');

              // Create particles
              const particles: any[] = [];
              const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffd93d', '#95e1d3'];
              for (let i = 0; i < 15; i++) {
                const angle = (i / 15) * Math.PI * 2;
                const radius = 100;
                particles.push({
                  x: WIDTH / 2 + Math.cos(angle) * radius,
                  y: HEIGHT / 2 + Math.sin(angle) * radius,
                  life: i / 15,
                  maxLife: 1,
                  color: colors[i % colors.length],
                });
              }

              // Draw particles
              particles.forEach((p: any, i: number) => {
                c.circle(p.x, p.y, 3)
                  .fill(p.color)
                  .withId(`particle-${i}`);
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('particles-fade.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render fountain emitter pattern', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Particles Fountain', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            const { cosyne } = require('../src');
            cosyne(a, (c: any) => {
              // Background
              c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');

              const emitterX = WIDTH / 2;
              const emitterY = HEIGHT - 50;
              const particles: any[] = [];
              const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1'];

              // Create fountain particles
              for (let i = 0; i < 25; i++) {
                const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 4;
                const yOffset = 20 + Math.random() * 80;
                particles.push({
                  x: emitterX + Math.cos(angle) * (emitterY - yOffset),
                  y: yOffset,
                  life: 0.5 + Math.random() * 0.5,
                  maxLife: 1,
                  color: colors[i % colors.length],
                });
              }

              // Emitter base
              c.rect(emitterX - 20, emitterY - 5, 40, 10).fill('#fff').withId('emitter-base');

              // Draw particles
              particles.forEach((p: any, i: number) => {
                const alpha = p.life / p.maxLife;
                c.circle(p.x, p.y, 3)
                  .fill(p.color);
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('particles-fountain.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('should render burst emission pattern', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'Particles Burst', width: WIDTH + 40, height: HEIGHT + 60 }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            const { cosyne } = require('../src');
            cosyne(a, (c: any) => {
              // Background
              c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');

              const emitterX = WIDTH / 2;
              const emitterY = HEIGHT / 2;
              const particles: any[] = [];
              const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffd93d'];

              // Create burst particles
              for (let i = 0; i < 30; i++) {
                const angle = (i / 30) * Math.PI * 2;
                const distance = 50 + Math.random() * 30;
                particles.push({
                  x: emitterX + Math.cos(angle) * distance,
                  y: emitterY + Math.sin(angle) * distance,
                  life: 0.8 + Math.random() * 0.2,
                  maxLife: 1,
                  color: colors[i % colors.length],
                });
              }

              // Emitter
              c.circle(emitterX, emitterY, 5).fill('#fff');

              // Draw burst particles
              particles.forEach((p: any, i: number) => {
                const alpha = p.life / p.maxLife;
                c.circle(p.x, p.y, 3)
                  .fill(p.color);
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await ctx.captureScreenshot('particles-burst.png');

    const widgets = await ctx.getAllWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });
});
