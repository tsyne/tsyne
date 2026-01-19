/**
 * Dial Dashboard - Cosyne Dial Showcase
 *
 * Demonstrates the CosyneDial primitive with different styles, configurations,
 * and interactive features including:
 * - Multiple style presets (classic, minimal, vintage, modern)
 * - Custom color schemes
 * - Different angle ranges (270°, 180°, 360°)
 * - Tick marks with major/minor styling
 * - Value bindings and callbacks
 * - Interactive drag-to-rotate
 *
 * @tsyne-app:name Dial Dashboard
 * @tsyne-app:icon radioButton
 * @tsyne-app:category Demos
 * @tsyne-app:args (a: App) => void
 */

import { cosyne, CosyneContext, refreshAllCosyneContexts } from '../../cosyne/src';
import { enableEventHandling } from '../../cosyne/src/events';

// ============================================================================
// Types
// ============================================================================

interface DialState {
  volume: number;
  temperature: number;
  pan: number;
  speed: number;
}

// ============================================================================
// Main App
// ============================================================================

export function createDialDashboardApp(app: any, win: any): () => void {
  // State for reactive bindings
  const state: DialState = {
    volume: 50,
    temperature: 21.5,
    pan: 0,
    speed: 75,
  };

  // Track interval for cleanup
  let updateInterval: ReturnType<typeof setInterval> | undefined;
  let cosyneCtx: CosyneContext | undefined;

  // Create window content
  win.setContent(() => {
    app.vbox(() => {
      // Title
      app.label('Dial Dashboard - Cosyne Dial Showcase').withId('title');
      app.separator();

      // Main canvas area
      app.canvasStack({ width: 480, height: 400 }, () => {
        cosyne(app, (c) => {
          cosyneCtx = c;

          // Background
          c.rect(0, 0, 480, 400).fill('#f5f5f5');

          // ========== Row 1: Different Styles ==========

          // Classic Style Volume Knob
          c.text(60, 15, 'Volume', { alignment: 'center', size: 12, color: '#333' });
          const volumeDial = c.dial(60, 80, {
            minValue: 0,
            maxValue: 100,
            value: state.volume,
            style: 'classic',
            radius: 35,
            valueSuffix: '%',
            showTicks: true,
            tickCount: 11,
            onValueChange: (v) => {
              state.volume = v;
            },
          }).withId('volume-dial');

          // Minimal Style
          c.text(170, 15, 'Brightness', { alignment: 'center', size: 12, color: '#333' });
          c.dial(170, 80, {
            minValue: 0,
            maxValue: 100,
            value: 65,
            style: 'minimal',
            radius: 35,
            valueSuffix: '%',
            showTicks: true,
            tickCount: 5,
          }).withId('brightness-dial');

          // Vintage Style Temperature
          c.text(280, 15, 'Temp', { alignment: 'center', size: 12, color: '#5c4033' });
          const tempDial = c.dial(280, 80, {
            minValue: 15,
            maxValue: 30,
            value: state.temperature,
            style: 'vintage',
            radius: 35,
            valueSuffix: '°',
            valueDecimals: 1,
            step: 0.5,
            showTicks: true,
            tickCount: 16,
            majorTickInterval: 5,
            onValueChange: (v) => {
              state.temperature = v;
            },
          }).withId('temp-dial');

          // Modern Style Speed
          c.text(390, 15, 'Speed', { alignment: 'center', size: 12, color: '#ffffff' });
          c.rect(340, 30, 100, 100).fill('#1a1a1a');
          c.dial(390, 80, {
            minValue: 0,
            maxValue: 100,
            value: state.speed,
            style: 'modern',
            radius: 35,
            valueSuffix: '',
            showTicks: true,
            tickCount: 11,
            onValueChange: (v) => {
              state.speed = v;
            },
          }).withId('speed-dial');

          // ========== Row 2: Custom Configurations ==========

          // Full 360° dial (color wheel style)
          c.text(60, 170, 'Hue (360°)', { alignment: 'center', size: 12, color: '#333' });
          c.dial(60, 235, {
            minValue: 0,
            maxValue: 360,
            value: 180,
            startAngle: 0,
            endAngle: 360,
            radius: 35,
            accentColor: '#ff6b6b',
            trackColor: '#eeeeee',
            knobColor: '#ffffff',
            valueSuffix: '°',
            showTicks: true,
            tickCount: 13,  // Every 30 degrees
            majorTickInterval: 3,
          }).withId('hue-dial');

          // Half circle dial (0-180)
          c.text(170, 170, 'Angle (180°)', { alignment: 'center', size: 12, color: '#333' });
          c.dial(170, 235, {
            minValue: 0,
            maxValue: 180,
            value: 90,
            startAngle: -180,
            endAngle: 0,
            radius: 35,
            accentColor: '#9b59b6',
            trackColor: '#e0e0e0',
            valueSuffix: '°',
            showTicks: true,
            tickCount: 7,  // 0, 30, 60, 90, 120, 150, 180
          }).withId('angle-dial');

          // Pan control (-100 to +100, centered)
          c.text(280, 170, 'Pan (L/R)', { alignment: 'center', size: 12, color: '#333' });
          const panDial = c.dial(280, 235, {
            minValue: -100,
            maxValue: 100,
            value: state.pan,
            radius: 35,
            accentColor: '#27ae60',
            trackColor: '#cccccc',
            valuePrefix: '',
            valueSuffix: '',
            showTicks: true,
            tickCount: 21,
            majorTickInterval: 5,
            onValueChange: (v) => {
              state.pan = v;
            },
          }).withId('pan-dial');

          // Custom colors (no ticks)
          c.text(390, 170, 'Gain', { alignment: 'center', size: 12, color: '#333' });
          c.dial(390, 235, {
            minValue: 0,
            maxValue: 10,
            value: 5,
            radius: 35,
            accentColor: '#e74c3c',
            trackColor: '#fadbd8',
            knobColor: '#fdfefe',
            indicatorColor: '#c0392b',
            textColor: '#c0392b',
            showTicks: false,
            valueDecimals: 1,
          }).withId('gain-dial');

          // ========== Row 3: Size Variations ==========

          // Small dial
          c.text(50, 310, 'Small', { alignment: 'center', size: 10, color: '#666' });
          c.dial(50, 355, {
            minValue: 0,
            maxValue: 100,
            value: 30,
            radius: 20,
            style: 'classic',
            showValue: false,
            tickCount: 5,
          }).withId('small-dial');

          // Medium dial
          c.text(130, 310, 'Medium', { alignment: 'center', size: 10, color: '#666' });
          c.dial(130, 355, {
            minValue: 0,
            maxValue: 100,
            value: 60,
            radius: 30,
            style: 'minimal',
            showValue: true,
            tickCount: 9,
          }).withId('medium-dial');

          // Large dial
          c.text(230, 310, 'Large', { alignment: 'center', size: 10, color: '#666' });
          c.dial(230, 355, {
            minValue: 0,
            maxValue: 100,
            value: 80,
            radius: 40,
            style: 'classic',
            showValue: true,
            tickCount: 11,
          }).withId('large-dial');

          // Value binding demo
          c.text(360, 310, 'Bound', { alignment: 'center', size: 10, color: '#666' });
          const boundDial = c.dial(360, 355, {
            minValue: 0,
            maxValue: 100,
            value: 0,
            radius: 35,
            style: 'modern',
            accentColor: '#f39c12',
            showValue: true,
          })
            .bindValue(() => Math.sin(Date.now() / 1000) * 50 + 50)
            .withId('bound-dial');
        });
      });

      // Footer with current values
      app.separator();
      app.hbox(() => {
        app.label(`Vol: ${state.volume}%`).withId('vol-label');
        app.spacer();
        app.label(`Temp: ${state.temperature.toFixed(1)}°`).withId('temp-label');
        app.spacer();
        app.label(`Pan: ${state.pan}`).withId('pan-label');
        app.spacer();
        app.label(`Speed: ${state.speed}`).withId('speed-label');
      });
    });
  });

  // Set up event handling for interactivity
  if (cosyneCtx) {
    enableEventHandling(cosyneCtx, app, { width: 480, height: 400 });
  }

  // Animation loop for bound dial
  updateInterval = setInterval(() => {
    refreshAllCosyneContexts();
  }, 50);

  // Return cleanup function
  return () => {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = undefined;
    }
  };
}

// ============================================================================
// Standalone execution
// ============================================================================

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { app } = require('../../core/src/index');
  const { resolveTransport } = require('../../core/src/transport-resolver');

  app(resolveTransport(), { title: 'Dial Dashboard' }, (a: any) => {
    let cleanup: (() => void) | undefined;

    a.window({ title: 'Dial Dashboard', width: 500, height: 520 }, (win: any) => {
      cleanup = createDialDashboardApp(a, win);
      win.show();

      // Clean up on window close
      win.setCloseIntercept(async () => {
        if (cleanup) cleanup();
        return true;
      });
    });
  });
}
