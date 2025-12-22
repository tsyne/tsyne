// @tsyne-app:name Waveform Visualizer (Canvas)
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
// @tsyne-app:category media
// @tsyne-app:builder buildCanvasWaveformVisualizer

/**
 * Canvas-Based Waveform Visualizer
 *
 * Demonstrates:
 * - tappableCanvasRaster for interactive pixel rendering
 * - Efficient setPixelBuffer for full-canvas updates
 * - Interactive scrubber: tap waveform to seek
 * - Coordinate conversion (pixels to audio position)
 *
 * This mode is optimized for performance with large waveforms.
 * Click/tap anywhere on the waveform to jump to that position.
 */

import { app, App, Window } from '../../core/src';
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

export function buildCanvasWaveformVisualizer(a: App) {
  a.window(
    { title: 'Waveform Visualizer - Canvas Mode', width: 1000, height: 400 },
    (win: Window) => {
      let waveformData: WaveformData | null = null;
      let slices: WaveformSlice[] = [];
      let isPlaying = false;
      let playbackPosition = 0;
      let startTime = 0;
      let animationFrameId: NodeJS.Timeout | null = null;

      let playBtn: any;
      let pauseBtn: any;
      let positionLabel: any;
      let durationLabel: any;
      let waveformCanvas: any;
      let statusLabel: any;

      const canvasWidth = 960;
      const canvasHeight = 200;

      async function initializeWaveform() {
        try {
          statusLabel?.setText('Loading audio...');
          waveformData = await AudioProcessor.loadWaveform();

          slices = AudioProcessor.downsampleWaveform(waveformData, canvasWidth);
          statusLabel?.setText('Ready - tap waveform to seek');
          await drawWaveform();
        } catch (error) {
          statusLabel?.setText(`Error: ${String(error).substring(0, 40)}`);
        }
      }

      async function drawWaveform() {
        if (!waveformCanvas || slices.length === 0) return;

        const buffer = new Uint8Array(canvasWidth * canvasHeight * 4);
        const bgColor = { r: 40, g: 40, b: 40, a: 255 };

        // Clear background
        for (let i = 0; i < buffer.length; i += 4) {
          buffer[i] = bgColor.r;
          buffer[i + 1] = bgColor.g;
          buffer[i + 2] = bgColor.b;
          buffer[i + 3] = bgColor.a;
        }

        // Draw center line
        const centerY = Math.floor(canvasHeight / 2);
        const lineColor = { r: 100, g: 100, b: 100, a: 255 };
        for (let x = 0; x < canvasWidth; x++) {
          const idx = (centerY * canvasWidth + x) * 4;
          buffer[idx] = lineColor.r;
          buffer[idx + 1] = lineColor.g;
          buffer[idx + 2] = lineColor.b;
          buffer[idx + 3] = lineColor.a;
        }

        // Draw waveform slices
        const waveColor = { r: 0, g: 200, b: 100, a: 255 };
        for (let x = 0; x < Math.min(slices.length, canvasWidth); x++) {
          const peak = slices[x].peak * (canvasHeight / 2 - 5);
          const topY = Math.max(0, Math.floor(centerY - peak));
          const bottomY = Math.min(canvasHeight - 1, Math.floor(centerY + peak));

          for (let y = topY; y <= bottomY; y++) {
            const idx = (y * canvasWidth + x) * 4;
            buffer[idx] = waveColor.r;
            buffer[idx + 1] = waveColor.g;
            buffer[idx + 2] = waveColor.b;
            buffer[idx + 3] = waveColor.a;
          }
        }

        // Draw scrubber (yellow line)
        if (waveformData) {
          const scrubberX = Math.floor(
            (playbackPosition / waveformData.duration) * canvasWidth
          );

          if (scrubberX >= 0 && scrubberX < canvasWidth) {
            const scrubberColor = { r: 255, g: 255, b: 0, a: 255 };
            for (let y = 0; y < canvasHeight; y++) {
              const idx = (y * canvasWidth + scrubberX) * 4;
              buffer[idx] = scrubberColor.r;
              buffer[idx + 1] = scrubberColor.g;
              buffer[idx + 2] = scrubberColor.b;
              buffer[idx + 3] = scrubberColor.a;
            }
          }
        }

        await waveformCanvas.setPixelBuffer(buffer);
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
            drawWaveform();
          } else {
            updateTimeLabels();
            drawWaveform();
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

      async function handleCanvasTap(x: number) {
        if (!waveformData) return;

        // Convert pixel position to time
        const progress = Math.max(0, Math.min(1, x / canvasWidth));
        playbackPosition = progress * waveformData.duration;

        if (isPlaying) {
          startTime = Date.now() - playbackPosition * 1000;
          // Restart audio at new position
          startAudioPlayback(playbackPosition);
        }

        updateTimeLabels();
        await drawWaveform();
      }

      async function play() {
        if (!waveformData) return;

        isPlaying = true;
        startTime = Date.now() - playbackPosition * 1000;
        playBtn?.hide();
        pauseBtn?.show();
        statusLabel?.setText('Playing... (tap waveform to seek)');
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
        await drawWaveform();
      }

      async function stop() {
        isPlaying = false;
        playbackPosition = 0;
        stopAudioPlayback();
        if (animationFrameId) {
          clearTimeout(animationFrameId);
          animationFrameId = null;
        }
        playBtn?.show();
        pauseBtn?.hide();
        updateTimeLabels();
        statusLabel?.setText('Stopped');
        await drawWaveform();
      }

      // Build UI
      win.setContent(() => {
        a.vbox(() => {
          // Title
          a.label('Waveform Visualizer - Canvas Mode').withId('titleLabel');
          a.label('Pixabay: Hopeless Drum and Bass').withId('sourceLabel');
          a.label('🎨 Canvas-based rendering (tap to seek)')
            .withId('modeLabel');
          a.label('Demonstrates: tappableCanvasRaster, setPixelBuffer, interactive seeking')
            .withId('descLabel');
          a.separator();

          // Interactive canvas
          waveformCanvas = a
            .tappableCanvasRaster(canvasWidth, canvasHeight, {
              onTap: (x: number) => {
                handleCanvasTap(x);
              },
            })
            .withId('waveformCanvas');

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

          // Status
          statusLabel = a.label('Initializing...').withId('statusLabel');
        });
      });

      win.show();
      setTimeout(() => initializeWaveform(), 100);
    }
  );
}

// Clean up audio on exit
registerCleanupHandlers();

if (!isTestEnvironment) {
  app({ title: 'Waveform Visualizer - Canvas Mode' }, buildCanvasWaveformVisualizer);
}
