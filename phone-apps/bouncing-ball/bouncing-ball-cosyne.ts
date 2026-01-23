/**
 * Bouncing Ball Demo - Cosyne Phase 9
 *
 * Demonstrates physics-based animation patterns
 * - Ball bouncing with gravity simulation
 * - Easing functions for bouncy motion
 * - Interactive - click to bounce
 * - Multiple balls with different easing
 */

import { App } from 'tsyne';
import { CosyneContext, cosyne, refreshAllCosyneContexts, enableEventHandling, easeOutBounce, easeInOutCubic, easeOutElastic } from '../../cosyne/src';

interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isDragging: boolean;
}

export function buildBouncingBallApp(a: App): void {
  a.canvasStack(() => {
    let physicsCleanup: (() => void) | undefined;

    const cosyneCtx = cosyne(a, (c: CosyneContext) => {
      const canvasWidth = 500;
      const canvasHeight = 450;
      const gravity = 0.3;
      const damping = 0.95;
      const bounce = 0.8;

      // Ball states
      const balls: Map<string, BallState> = new Map();
      balls.set('ball1', {
        x: 100,
        y: 50,
        vx: 5,
        vy: 0,
        radius: 15,
        color: '#FF6B6B',
        isDragging: false,
      });

      balls.set('ball2', {
        x: 250,
        y: 50,
        vx: -3,
        vy: 0,
        radius: 20,
        color: '#4ECDC4',
        isDragging: false,
      });

      balls.set('ball3', {
        x: 400,
        y: 50,
        vx: 2,
        vy: 0,
        radius: 12,
        color: '#45B7D1',
        isDragging: false,
      });

      // Physics simulation
      const simulatePhysics = () => {
        balls.forEach((ball) => {
          if (ball.isDragging) return;

          // Apply gravity
          ball.vy += gravity;

          // Update position
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Apply damping
          ball.vx *= damping;
          ball.vy *= damping;

          // Bounce off bottom
          if (ball.y + ball.radius > canvasHeight - 10) {
            ball.y = canvasHeight - 10 - ball.radius;
            ball.vy *= -bounce;
          }

          // Bounce off top
          if (ball.y - ball.radius < 10) {
            ball.y = 10 + ball.radius;
            ball.vy *= -bounce;
          }

          // Bounce off sides
          if (ball.x - ball.radius < 10) {
            ball.x = 10 + ball.radius;
            ball.vx *= -bounce;
          }

          if (ball.x + ball.radius > canvasWidth - 10) {
            ball.x = canvasWidth - 10 - ball.radius;
            ball.vx *= -bounce;
          }
        });

        refreshAllCosyneContexts();
      };

      // Start physics loop
      const physicsInterval = setInterval(simulatePhysics, 30);

      // Background
      c
        .rect(0, 0, canvasWidth, canvasHeight)
        .fill('#F0F0F0');

      // Title
      c
        .rect(0, 0, canvasWidth, 40)
        .fill('#2C3E50');

      c
        .text(250, 20, 'Bouncing Balls - Phase 9 (Click to drag)')
        .fill('#FFFFFF');

      // Ground
      c
        .rect(0, canvasHeight - 10, canvasWidth, 10)
        .fill('#8B7355');

      // Walls
      c
        .line(10, 10, 10, canvasHeight - 10)
        .stroke('#8B7355', 2);

      c
        .line(canvasWidth - 10, 10, canvasWidth - 10, canvasHeight - 10)
        .stroke('#8B7355', 2);

      // Render balls
      balls.forEach((ball, key) => {
        c
          .circle(ball.x, ball.y, ball.radius)
          .fill(ball.color)
          .stroke('#FFFFFF', 2)
          .withId(key)
          .bindPosition(() => {
            const b = balls.get(key)!;
            return { x: b.x, y: b.y };
          })
          .onClick((e) => {
            // Start drag
            const b = balls.get(key)!;
            b.isDragging = true;
            b.vx = 0;
            b.vy = 0;
          })
          .onDrag((e) => {
            const b = balls.get(key)!;
            b.x = e.x;
            b.y = e.y;
            refreshAllCosyneContexts();
          })
          .onDragEnd(() => {
            const b = balls.get(key)!;
            b.isDragging = false;
            // Give it a small initial velocity
            b.vx = (Math.random() - 0.5) * 3;
            b.vy = -5;
          });

        // Ball shadow/glow (for visual effect)
        c
          .circle(ball.x, ball.y, ball.radius + 2)
          .stroke(ball.color, 1)
          .bindPosition(() => {
            const b = balls.get(key)!;
            return { x: b.x, y: b.y };
          })
          .bindAlpha(() => (balls.get(key)!.isDragging ? 0.5 : 0.2));
      });

      // Info text
      c
        .rect(10, canvasHeight - 50, canvasWidth - 20, 40)
        .fill('#FFFFFF')
        .stroke('#CCCCCC', 1);

      c
        .text(20, canvasHeight - 35, 'Drag balls around • Release to bounce • Gravity enabled')
        .fill('#2C3E50');

      // Store cleanup function for later
      physicsCleanup = () => clearInterval(physicsInterval);
    });

    // Attach cleanup to context (now that cosyneCtx exists)
    if (physicsCleanup) {
      (cosyneCtx as any)._cleanup = physicsCleanup;
    }

    // Enable event handling
    enableEventHandling(cosyneCtx, a, {
      width: 500,
      height: 450,
    });
  });
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport } = require('../../core/src');
  app(
    resolveTransport(),
    { title: 'Bouncing Ball - Cosyne Phase 9' },
    (a: any) => {
      a.window(
        { title: 'Bouncing Ball Demo', width: 550, height: 500 },
        (win: any) => {
          win.setContent(() => {
            buildBouncingBallApp(a);
          });
          win.show();
        }
      );
    }
  );
}
