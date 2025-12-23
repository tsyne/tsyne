// @tsyne-app:name Waveform Visualizer
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
// @tsyne-app:category media
// @tsyne-app:builder buildWaveformVisualizer

/**
 * Waveform Visualizer for Tsyne
 *
 * A real-time waveform visualizer with two rendering modes:
 * 1. Canvas mode (tappable scrubber) - efficient pixel rendering
 * 2. Widget mode (declarative slices) - idiomatic Tsyne composition
 *
 * Features:
 * - Interactive scrubber: tap to seek through audio
 * - Play/pause/stop controls
 * - Real-time position tracking
 * - Two rendering approaches (canvas vs declarative widgets)
 *
 * Audio source: Pixabay "Hopeless Drum and Bass"
 * https://pixabay.com/music/drum-n-bass-hopeless-drum-and-bass-full-369496/
 *
 * See also:
 * - canvas.ts - Standalone canvas mode demo
 * - widget.ts - Standalone widget mode demo
 * - common.ts - Shared utilities
 */

import { app, resolveTransport, App  } from '../../core/src';
import { buildCanvasWaveformVisualizer } from './canvas';
import { buildWidgetWaveformVisualizer } from './widget';
import { registerCleanupHandlers, isTestEnvironment } from './common';

// Re-export the individual builders
export { buildCanvasWaveformVisualizer } from './canvas';
export { buildWidgetWaveformVisualizer } from './widget';

/**
 * Main entry point - choose which mode to run
 * Uses canvas mode by default (more efficient for waveform display)
 */
export function buildWaveformVisualizer(a: App) {
  // Use canvas mode by default (more efficient for waveform display)
  buildCanvasWaveformVisualizer(a);

  // Uncomment below to use widget mode instead:
  // buildWidgetWaveformVisualizer(a);
}

// Clean up audio on exit
registerCleanupHandlers();

if (!isTestEnvironment) {
  app(resolveTransport(), { title: 'Waveform Visualizer' }, buildWaveformVisualizer);
}
