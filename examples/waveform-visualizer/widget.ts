// @tsyne-app:name Waveform Visualizer (Widget)
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
// @tsyne-app:category media
// @tsyne-app:builder buildWidgetWaveformVisualizer

/**
 * Widget-Based Waveform Visualizer
 *
 * Demonstrates:
 * - Pseudo-declarative UI composition
 * - Each waveform slice as a TypeScript widget (vbox with dynamic height)
 * - Declarative visibility with .when()
 * - Idiomatic Tsyne pattern for complex layouts
 *
 * This mode shows the most "Tsyne-like" approach: pure widget composition.
 * Each slice is a UI element that can be styled, animated, or interacted with.
 */

import { app, resolveTransport, App, Window  } from '../../core/src';
import {
  AudioProcessor,
  WaveformData,
  WaveformSlice,
  startAudioPlayback,
  stopAudioPlayback,
  formatTime,
  registerCleanupHandlers,
  isTestEnvironment,
} from './common';

export function buildWidgetWaveformVisualizer(a: App) {
  a.window(
    { title: 'Waveform Visualizer - Widget Mode', width: 1000, height: 400 },
    (win: Window) => {
      let waveformData: WaveformData | null = null;
      let slices: WaveformSlice[] = [];
      let isPlaying = false;
      let playbackPosition = 0;
      let startTime = 0;
      let animationFrameId: NodeJS.Timeout | null = null;
      let currentSliceIndex = 0;

      let playBtn: any;
      let pauseBtn: any;
      let positionLabel: any;
      let durationLabel: any;
      let statusLabel: any;
      let waveformContainer: any;
      let sliceElements: Map<number, any> = new Map();

      async function initializeWaveform() {
        try {
          statusLabel?.setText('Loading audio...');
          waveformData = await AudioProcessor.loadWaveform();

          // Match canvas: ~960 slices to fill width with 2px bars
          slices = AudioProcessor.downsampleWaveform(waveformData, 480);
          durationLabel?.setText(formatTime(waveformData.duration));
          await renderWaveformSlices();
          statusLabel?.setText('Ready to play');
        } catch (error) {
          statusLabel?.setText(`Error: ${String(error).substring(0, 40)}`);
        }
      }

      async function renderWaveformSlices() {
        if (!waveformContainer || slices.length === 0) return;

        // Clear existing content
        waveformContainer.removeAll();
        sliceElements.clear();

        // Find max peak for normalization
        let maxPeak = 0;
        for (const slice of slices) {
          maxPeak = Math.max(maxPeak, slice.peak);
        }
        if (maxPeak === 0) maxPeak = 1;

        // Mirrored waveform: bars extend both up and down from center
        const barWidth = 2;  // Thin bars, no gaps
        const maxHeight = 200;  // Total height of waveform area
        const halfHeight = maxHeight / 2;  // Each side from center

        waveformContainer.add(() => {
          for (const slice of slices) {
            // Normalize: bar extends this much above AND below center
            const normalizedPeak = slice.peak / maxPeak;
            const barHalfHeight = Math.max(1, Math.floor(normalizedPeak * (halfHeight - 2)));
            const totalBarHeight = barHalfHeight * 2;  // Mirrored height
            const spacerHeight = (maxHeight - totalBarHeight) / 2;
            const id = `slice-${slice.index}`;

            // Each bar centered vertically (mirrored waveform style)
            a.vbox(() => {
              // Top spacer centers the bar
              if (spacerHeight > 0) {
                a.rectangle('#282828', barWidth, spacerHeight);  // Dark bg
              }
              // Green bar - centered, represents both up and down from center
              const sliceWidget = a.rectangle('#00C864', barWidth, totalBarHeight).withId(id);
              sliceElements.set(slice.index, sliceWidget);
              // Bottom spacer
              if (spacerHeight > 0) {
                a.rectangle('#282828', barWidth, spacerHeight);  // Dark bg
              }
            }, { spacing: 0 });  // No gaps within each slice column
          }
        });
      }

      function animationLoop() {
        if (isPlaying && waveformData) {
          const elapsed = (Date.now() - startTime) / 1000;
          playbackPosition = elapsed;

          if (playbackPosition >= waveformData.duration) {
            isPlaying = false;
            playbackPosition = 0;
            playBtn?.show();
            pauseBtn?.hide();
            statusLabel?.setText('Finished');
            updateTimeLabels();
            updateSliceHighlights();
          } else {
            updateTimeLabels();
            updateSliceHighlights();
            animationFrameId = setTimeout(animationLoop, 30);
          }
        }
      }

      function updateTimeLabels() {
        const minutes = Math.floor(playbackPosition / 60);
        const seconds = Math.floor(playbackPosition % 60);
        positionLabel?.setText(
          `${minutes}:${String(seconds).padStart(2, '0')}`
        );
      }

      async function updateSliceHighlights() {
        if (!waveformData || slices.length === 0) return;

        const newSliceIndex = Math.floor(
          (playbackPosition / waveformData.duration) * slices.length
        );

        // Update colors based on playback position
        for (let i = 0; i < slices.length; i++) {
          const element = sliceElements.get(i);
          if (element) {
            if (i < newSliceIndex) {
              // Already played - dim gray
              element.setFillColor('#606060');
            } else if (i === newSliceIndex) {
              // Currently playing - bright yellow
              element.setFillColor('#FFFF00');
            } else {
              // Future - green
              element.setFillColor('#00C864');
            }
          }
        }
        currentSliceIndex = newSliceIndex;
      }

      async function play() {
        if (!waveformData) return;

        isPlaying = true;
        startTime = Date.now() - playbackPosition * 1000;
        playBtn?.hide();
        pauseBtn?.show();
        statusLabel?.setText('Playing...');
        startAudioPlayback(playbackPosition);
        animationLoop();
      }

      async function pause() {
        isPlaying = false;
        stopAudioPlayback();
        if (animationFrameId) {
          clearTimeout(animationFrameId);
          animationFrameId = null;
        }
        playBtn?.show();
        pauseBtn?.hide();
        statusLabel?.setText('Paused');
      }

      async function stop() {
        isPlaying = false;
        playbackPosition = 0;
        currentSliceIndex = 0;
        stopAudioPlayback();
        if (animationFrameId) {
          clearTimeout(animationFrameId);
          animationFrameId = null;
        }
        playBtn?.show();
        pauseBtn?.hide();
        updateTimeLabels();
        statusLabel?.setText('Stopped');
        await updateSliceHighlights();
      }

      // Build UI
      win.setContent(() => {
        a.vbox(() => {
          // Title
          a.label('Waveform Visualizer - Widget Mode').withId('titleLabel');
          a.label('Pixabay: Hopeless Drum and Bass').withId('sourceLabel');
          a.label('🎨 Declarative slice-based rendering')
            .withId('modeLabel');
          a.label('Demonstrates: pseudo-declarative composition, .when(), widget slices')
            .withId('descLabel');
          a.separator();

          // Waveform container - dark background, no gaps, fixed height
          a.scroll(() => {
            waveformContainer = a.hbox(() => {
              a.label('Loading waveform slices...');
            }, { spacing: 0 });  // No gaps between slices
          }).withMinSize(960, 200);

          a.separator();

          // Controls
          a.hbox(() => {
            playBtn = a
              .button('▶ Play')
              .onClick(() => play())
              .withId('playBtn');
            pauseBtn = a
              .button('⏸ Pause')
              .onClick(() => pause())
              .withId('pauseBtn')
              .when(() => false);
            a.button('⏹ Stop')
              .onClick(() => stop())
              .withId('stopBtn');
          });

          // Time display
          a.hbox(() => {
            a.label('Position: ').withId('positionLbl');
            positionLabel = a.label('0:00').withId('positionLabel');
            a.label(' / ').withId('slashLabel');
            durationLabel = a
              .label(
                waveformData ? formatTime(waveformData.duration) : '0:00'
              )
              .withId('durationLabel');
          });

          // Status and info
          statusLabel = a.label('Initializing...').withId('statusLabel');
          a.label('ℹ️ Each vertical bar is a TypeScript widget element')
            .withId('infoLabel');
        });
      });

      win.show();
      setTimeout(() => initializeWaveform(), 100);

      // Register cleanup to stop animation timer when app shuts down
      a.registerCleanup(() => {
        if (animationFrameId) {
          clearTimeout(animationFrameId);
          animationFrameId = null;
        }
        stopAudioPlayback();
      });
    }
  );
}

// Clean up audio on exit
registerCleanupHandlers();

if (!isTestEnvironment) {
  app(resolveTransport(), { title: 'Waveform Visualizer - Widget Mode' }, buildWidgetWaveformVisualizer);
}
