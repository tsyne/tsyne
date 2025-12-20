// @tsyne-app:name Paris Density
// @tsyne-app:category visualization
// @tsyne-app:builder buildParisDensity
// Portions copyright Yvann Barbot and portions copyright Paul Hammant 2025

import type { App, Window, Label } from '../../core/src';
import { generateDensityGrid, interpolateDensityGrids, DensityPoint, TimeOfWeek } from './simulation';
import { densityToRGBA } from './colorScale';

export function buildParisDensity(a: App) {
  let time: TimeOfWeek = { hour: 12, day: 0 };
  let canvas: any;
  let timeLabel: Label | undefined;
  let densityCache: Record<string, DensityPoint[]> = {};
  let animationRunning = true;
  let animationSpeed = 1.0;
  let canvasWidth = 600;
  let canvasHeight = 400;

  function getCacheKey(time: TimeOfWeek): string {
    return `${time.hour}:${time.day}`;
  }

  function getDensityGrid(t: TimeOfWeek): DensityPoint[] {
    const key = getCacheKey(t);
    if (!densityCache[key]) {
      densityCache[key] = generateDensityGrid(t);
    }
    return densityCache[key];
  }

  async function renderDensityCanvas() {
    if (!canvas) return;

    const pixelData = new Uint8Array(canvasWidth * canvasHeight * 4);

    // Clear to background
    for (let i = 0; i < pixelData.length; i += 4) {
      pixelData[i] = 30;      // R (dark background)
      pixelData[i + 1] = 30;  // G
      pixelData[i + 2] = 40;  // B
      pixelData[i + 3] = 255; // A
    }

    const grid = getDensityGrid(time);

    // Render density points with smooth gradients
    for (const point of grid) {
      const px = Math.round(point.x * (canvasWidth - 1));
      const py = Math.round(point.y * (canvasHeight - 1));

      if (px >= 0 && px < canvasWidth && py >= 0 && py < canvasHeight) {
        const [r, g, b, a] = densityToRGBA(point.density, 0.8);
        const idx = (py * canvasWidth + px) * 4;

        // Blend with existing pixel (simple alpha blending)
        const alpha = a / 255;
        pixelData[idx] = Math.round(pixelData[idx] * (1 - alpha) + r * alpha);
        pixelData[idx + 1] = Math.round(pixelData[idx + 1] * (1 - alpha) + g * alpha);
        pixelData[idx + 2] = Math.round(pixelData[idx + 2] * (1 - alpha) + b * alpha);
        pixelData[idx + 3] = 255;
      }
    }

    await canvas.setPixelBuffer(pixelData);
  }

  function updateTimeLabel() {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const label = `${dayNames[time.day]} ${String(time.hour).padStart(2, '0')}:00`;
    if (timeLabel) {
      timeLabel.setText(label);
    }
  }

  function setTime(h: number, d: number) {
    time = { hour: h % 24, day: d % 7 };
    updateTimeLabel();
    void renderDensityCanvas();
  }

  function nextHour() {
    time.hour += 1;
    if (time.hour >= 24) {
      time.hour = 0;
      time.day = (time.day + 1) % 7;
    }
    updateTimeLabel();
    void renderDensityCanvas();
  }

  function nextDay() {
    time.day = (time.day + 1) % 7;
    updateTimeLabel();
    void renderDensityCanvas();
  }

  async function animationLoop() {
    let frameCount = 0;
    const frameInterval = Math.max(1, Math.round(10 / animationSpeed)); // ~10s per hour at speed 1.0

    while (animationRunning) {
      frameCount += 1;
      if (frameCount % frameInterval === 0) {
        nextHour();
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  a.window({ title: 'Paris Density Simulation', width: 800, height: 700 }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        // Title
        a.label('Paris Foot Traffic Density').withId('title');

        // Canvas
        const rawCanvas = a.tappableCanvasRaster(canvasWidth, canvasHeight, {
          onTap: (x, y) => {
            // Tapping on canvas could trigger various interactions
            console.log(`Tapped at ${x}, ${y}`);
          }
        }) as any;
        canvas = rawCanvas;
        if (rawCanvas && typeof rawCanvas.withId === 'function') {
          rawCanvas.withId('densityCanvas');
        }

        // Time display
        a.hbox(() => {
          timeLabel = a.label('Sun 12:00').withId('timeLabel');
          a.spacer();
        });

        // Controls
        a.hbox(() => {
          a.button('← Hour').onClick(() => {
            time.hour = (time.hour - 1 + 24) % 24;
            updateTimeLabel();
            void renderDensityCanvas();
          }).withId('prevHourBtn');

          a.button('Hour →').onClick(() => nextHour()).withId('nextHourBtn');

          a.spacer();

          a.button('← Day').onClick(() => {
            time.day = (time.day - 1 + 7) % 7;
            updateTimeLabel();
            void renderDensityCanvas();
          }).withId('prevDayBtn');

          a.button('Day →').onClick(() => nextDay()).withId('nextDayBtn');
        });

        // Animation controls
        a.hbox(() => {
          a.button('Play').onClick(() => {
            animationRunning = true;
            void animationLoop();
          }).withId('playBtn');

          a.button('Pause').onClick(() => {
            animationRunning = false;
          }).withId('pauseBtn');

          a.spacer();

          a.button('Reset').onClick(() => {
            setTime(12, 0);
          }).withId('resetBtn');
        });

        // Speed control
        a.hbox(() => {
          a.label('Speed:').withId('speedLabel');
          a.slider(0.25, 2.0, 1.0, (val: number) => {
            animationSpeed = val;
          }).withId('speedSlider');
          a.spacer();
        });

        // Info
        a.label('Simulates Paris foot traffic based on hotspots and temporal patterns')
          .withId('infoLabel');
      });
    });

    win.show();
  });

  // Initial render
  updateTimeLabel();
  void renderDensityCanvas();
}

// Standalone execution for testing
if (require.main === module) {
  const { app } = require('../../src');
  app({ title: 'Paris Density Simulation' }, (a: App) => {
    buildParisDensity(a);
  });
}
