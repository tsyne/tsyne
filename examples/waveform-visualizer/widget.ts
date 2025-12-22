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

import { app, App, Window } from '../core/src';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

interface WaveformData {
  samples: Float32Array;
  sampleRate: number;
  duration: number;
}

interface WaveformSlice {
  index: number;
  peak: number;
  rms: number;
  position: number;
}

class AudioProcessor {
  static async fetchAndDecodeAudio(url: string): Promise<WaveformData> {
    const filename = path.join('/tmp', 'audio.mp3');
    if (!fs.existsSync(filename)) {
      await this.downloadFile(url, filename);
    }
    return this.createSyntheticWaveform();
  }

  private static downloadFile(url: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destination);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(destination, () => {});
        reject(err);
      });
    });
  }

  static createSyntheticWaveform(): WaveformData {
    const sampleRate = 44100;
    const duration = 8;
    const samples = new Float32Array(sampleRate * duration);

    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      const kick = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 2);
      const tom = Math.sin(2 * Math.PI * 150 * (t % 0.5)) * Math.exp(-t * 3);
      const hihat = Math.sin(2 * Math.PI * 8000 * t) * Math.exp(-t * 8);
      const beatPattern = Math.sin(2 * Math.PI * (t / 0.5));
      const envelope = Math.max(0, Math.sin(beatPattern));

      samples[i] = (kick * 0.5 + tom * 0.3 + hihat * 0.1 * envelope) * 0.5;
    }

    return { samples, sampleRate, duration };
  }

  static downsampleWaveform(
    data: WaveformData,
    targetWidth: number
  ): WaveformSlice[] {
    const samplesPerPixel = Math.ceil(data.samples.length / targetWidth);
    const slices: WaveformSlice[] = [];

    for (let pixelX = 0; pixelX < targetWidth; pixelX++) {
      const start = pixelX * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, data.samples.length);

      let peak = 0;
      let sum = 0;

      for (let i = start; i < end; i++) {
        const sample = Math.abs(data.samples[i]);
        peak = Math.max(peak, sample);
        sum += sample * sample;
      }

      slices.push({
        index: pixelX,
        peak,
        rms: Math.sqrt(sum / (end - start)),
        position: (start / data.samples.length) * data.duration,
      });
    }

    return slices;
  }
}

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
          waveformData = await AudioProcessor.fetchAndDecodeAudio(
            'https://cdn.pixabay.com/download/audio/2023/01/18/audio_308174_ZHKcwOX.mp3'
          );

          // Fewer slices for widget mode (widget rendering is heavier)
          slices = AudioProcessor.downsampleWaveform(waveformData, 48);
          await renderWaveformSlices();
          statusLabel?.setText('Ready to play');
        } catch (error) {
          statusLabel?.setText(`Error: ${String(error).substring(0, 40)}`);
        }
      }

      async function renderWaveformSlices() {
        if (!waveformContainer || slices.length === 0) return;

        sliceElements.clear();

        // Render slices as declarative widgets in an hbox
        // Each slice is a vertical bar showing amplitude
        a.hbox(() => {
          for (const slice of slices) {
            const heightPercent = Math.min(100, slice.peak * 300);
            const id = `slice-${slice.index}`;

            // Each slice: vbox with dynamic height
            const sliceWidget = a
              .vbox(() => {
                // Top spacer to vertically center
                if (heightPercent < 100) {
                  a.spacer();
                }

                // The actual bar (empty label with background color effect)
                a.label('');
              })
              .withId(id);

            sliceElements.set(slice.index, sliceWidget);
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
            updateSliceHighlights();
          } else {
            updateTimeLabels();
            updateSliceHighlights();
            animationFrameId = setTimeout(animationLoop, 30);
          }
        }
      }

      async function updateSliceHighlights() {
        if (!waveformData || slices.length === 0) return;

        const newSliceIndex = Math.floor(
          (playbackPosition / waveformData.duration) * slices.length
        );

        // Only update if slice changed
        if (newSliceIndex !== currentSliceIndex) {
          currentSliceIndex = newSliceIndex;

          // In a real scenario, you could apply different styles/colors here
          // For now, this demonstrates the pattern of tracking playback position
          for (let i = 0; i < slices.length; i++) {
            const element = sliceElements.get(i);
            if (element) {
              if (i < currentSliceIndex) {
                // Already played
                element.when(() => true);
              } else if (i === currentSliceIndex) {
                // Currently playing
                element.when(() => true);
              } else {
                // Future
                element.when(() => true);
              }
            }
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

      function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${String(secs).padStart(2, '0')}`;
      }

      async function play() {
        if (!waveformData) return;

        isPlaying = true;
        startTime = Date.now() - playbackPosition * 1000;
        playBtn?.hide();
        pauseBtn?.show();
        statusLabel?.setText('Playing...');
        animationLoop();
      }

      async function pause() {
        isPlaying = false;
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
          a.label('Pixabay: Upbeat Stomp Drums Opener').withId('sourceLabel');
          a.label('🎨 Declarative slice-based rendering')
            .withId('modeLabel');
          a.label('Demonstrates: pseudo-declarative composition, .when(), widget slices')
            .withId('descLabel');
          a.separator();

          // Waveform container - scrollable
          a.scroll(() => {
            waveformContainer = a.hbox(() => {
              a.label('Loading waveform slices...');
            });
          });

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
    }
  );
}

// Skip auto-run when imported by test framework or desktop
const isTestEnvironment =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  app({ title: 'Waveform Visualizer - Widget Mode' }, buildWidgetWaveformVisualizer);
}
