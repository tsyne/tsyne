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
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { cosyne, CosyneContext, refreshAllCosyneContexts, enableEventHandling } from '../../cosyne/src';

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

  // Label references for dynamic updates
  let volLabel: any;
  let tempLabel: any;
  let panLabel: any;
  let speedLabel: any;

  // Helper to update footer labels
  const updateLabels = () => {
    if (volLabel) volLabel.setText(`Vol: ${state.volume}%`);
    if (tempLabel) tempLabel.setText(`Temp: ${state.temperature.toFixed(1)}°`);
    if (panLabel) panLabel.setText(`Pan: ${state.pan}`);
    if (speedLabel) speedLabel.setText(`Speed: ${state.speed}`);
  };

  // Create window content
  win.setContent(() => {
    app.vbox(() => {
      // Title
      app.label('Dial Dashboard - Cosyne Dial Showcase').withId('title');
      app.separator();

      // Main canvas area
      app.canvasStack(() => {
        cosyne(app, (c) => {
          cosyneCtx = c;

          // Background
          c.rect(0, 0, 520, 480).fill('#f5f5f5');

          // ========== Row 1: Different Styles ==========
          // Spacing: 4 dials across 520px width, centers at 70, 180, 300, 420

          // Classic Style Volume Knob
          c.text(70, 15, 'Volume', { alignment: 'center', size: 12, color: '#333' });
          const volumeDial = c.dial(70, 85, {
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
              updateLabels();
              // refreshAllCosyneContexts(); // Handled by 50ms interval
            },
          }).withId('volume-dial');

          // Minimal Style
          c.text(180, 15, 'Brightness', { alignment: 'center', size: 12, color: '#333' });
          c.dial(180, 85, {
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
          c.text(300, 15, 'Temp', { alignment: 'center', size: 12, color: '#5c4033' });
          const tempDial = c.dial(300, 85, {
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
              updateLabels();
              // refreshAllCosyneContexts(); // Handled by 50ms interval
            },
          }).withId('temp-dial');

          // Modern Style Speed
          c.text(420, 15, 'Speed', { alignment: 'center', size: 12, color: '#ffffff' });
          c.rect(365, 30, 110, 110).fill('#1a1a1a');
          c.dial(420, 85, {
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
              updateLabels();
              // refreshAllCosyneContexts(); // Handled by 50ms interval
            },
          }).withId('speed-dial');

          // ========== Row 2: Custom Configurations ==========

          // Full 360° dial (color wheel style)
          c.text(70, 180, 'Hue (360°)', { alignment: 'center', size: 12, color: '#333' });
          c.dial(70, 250, {
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
          c.text(180, 180, 'Angle (180°)', { alignment: 'center', size: 12, color: '#333' });
          c.dial(180, 250, {
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
          c.text(300, 180, 'Pan (L/R)', { alignment: 'center', size: 12, color: '#333' });
          const panDial = c.dial(300, 250, {
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
              updateLabels();
              // refreshAllCosyneContexts(); // Handled by 50ms interval
            },
          }).withId('pan-dial');

          // Custom colors (no ticks)
          c.text(420, 180, 'Gain', { alignment: 'center', size: 12, color: '#333' });
          c.dial(420, 250, {
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
          c.text(70, 350, 'Small', { alignment: 'center', size: 10, color: '#666' });
          c.dial(70, 400, {
            minValue: 0,
            maxValue: 100,
            value: 30,
            radius: 20,
            style: 'classic',
            showValue: false,
            tickCount: 5,
          }).withId('small-dial');

          // Medium dial
          c.text(180, 350, 'Medium', { alignment: 'center', size: 10, color: '#666' });
          c.dial(180, 400, {
            minValue: 0,
            maxValue: 100,
            value: 60,
            radius: 30,
            style: 'minimal',
            showValue: true,
            tickCount: 9,
          }).withId('medium-dial');

          // Large dial
          c.text(300, 350, 'Large', { alignment: 'center', size: 10, color: '#666' });
          c.dial(300, 400, {
            minValue: 0,
            maxValue: 100,
            value: 80,
            radius: 40,
            style: 'classic',
            showValue: true,
            tickCount: 11,
          }).withId('large-dial');

          // Value binding demo
          c.text(420, 350, 'Bound', { alignment: 'center', size: 10, color: '#666' });
          const boundDial = c.dial(420, 400, {
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

          // Enable event handling at the end so it overlays all primitives
          enableEventHandling(c, app, { width: 520, height: 480 });
        });
      });

      // Footer with current values
      app.separator();
      app.hbox(() => {
        volLabel = app.label(`Vol: ${state.volume}%`).withId('vol-label');
        app.spacer();
        tempLabel = app.label(`Temp: ${state.temperature.toFixed(1)}°`).withId('temp-label');
        app.spacer();
        panLabel = app.label(`Pan: ${state.pan}`).withId('pan-label');
        app.spacer();
        speedLabel = app.label(`Speed: ${state.speed}`).withId('speed-label');
      });
    });
  });

  // Animation loop for bound dial and dial updates
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
  const { app, resolveTransport } = require('../../core/src/index');

  app(resolveTransport(), { title: 'Dial Dashboard' }, (a: any) => {
    let cleanup: (() => void) | undefined;

    a.window({ title: 'Dial Dashboard', width: 540, height: 600 }, (win: any) => {
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
