/**
 * Amiga Boing Ball - Uses checkered sphere primitive
 *
 * The checkered sphere is app-specific, not a general cosyne primitive.
 * Background/grid use cosyne, ball uses core canvas widget directly.
 */

import { App } from '../../core/src';
import { cosyne, refreshAllCosyneContexts, enableEventHandling } from '../../cosyne/src';

const W = 600, H = 500;
const R = 96;  // Ball radius

// Sphere grid configuration (8x8 checkerboard like original Amiga boing)
const LAT_BANDS = 8;
const LON_SEGMENTS = 8;

export function buildAmigaBoingApp(a: App): void {
  a.canvasStack(() => {
    let cleanup: (() => void) | undefined;
    let x = W / 2, y = R + 80, vx = 4, vy = 0;
    let rotation = 0;  // Y-axis rotation for spin
    const gravity = 0.5, bounce = 0.9;
    const rotationSpeed = 0.08;  // How fast the ball spins

    const ctx = cosyne(a, (c) => {
      // Background + grid (classic purple-gray)
      c.rect(0, 0, W, H).fill('#5c4a72');
      for (let i = 50; i < W; i += 50) c.line(i, 0, i, H).stroke('#4a3a5a', 2);
      for (let i = 50; i < H; i += 50) c.line(0, i, W, i).stroke('#4a3a5a', 2);

      // Shadow (uses cosyne bindings)
      c.circle(x, H - 15, R * 0.6).fill('rgba(0,0,0,0.3)')
        .bindPosition(() => ({ x, y: H - 15 }));
    });

    // Create the checkered ball using core widget directly (app-specific)
    const ball = a.canvasCheckeredSphere({
      cx: x,
      cy: y,
      radius: R,
      latBands: LAT_BANDS,
      lonSegments: LON_SEGMENTS,
      rotation: 0,
      color1: '#cc0000',  // Red
      color2: '#ffffff',  // White
    });

    // Physics + rotation animation
    const tick = setInterval(() => {
      vy += gravity;
      x += vx; y += vy;

      // Rotate based on horizontal velocity (like a rolling ball)
      rotation += rotationSpeed * Math.sign(vx);

      // Bounce off walls
      if (x - R < 0) { x = R; vx = Math.abs(vx); }
      if (x + R > W) { x = W - R; vx = -Math.abs(vx); }
      if (y + R > H - 10) { y = H - 10 - R; vy *= -bounce; }
      if (y - R < 0) { y = R; vy = Math.abs(vy); }

      // Update ball position and rotation directly
      ball.update({ cx: x, cy: y, rotation });

      // Refresh cosyne bindings (for shadow)
      refreshAllCosyneContexts();
    }, 25);

    cleanup = () => clearInterval(tick);
    if (cleanup) (ctx as any)._cleanup = cleanup;
    enableEventHandling(ctx, a, { width: W, height: H });
  });
}

if (require.main === module) {
  const { app, resolveTransport } = require('../../core/src');
  app(resolveTransport(), { title: 'Amiga Boing' }, (a: any) => {
    a.window({ title: 'Boing! (1984)', width: W, height: H }, (win: any) => {
      win.setContent(() => buildAmigaBoingApp(a));
      win.show();
    });
  });
}
