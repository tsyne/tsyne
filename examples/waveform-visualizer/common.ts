/**
 * Common utilities for Waveform Visualizer demos
 *
 * Shared code between canvas.ts and widget.ts modes:
 * - Audio file path and playback control
 * - Waveform data structures and processing
 * - Time formatting utilities
 */

import * as path from 'path';
import { spawn, ChildProcess, execSync } from 'child_process';

// Audio file path - use short 5s clip for faster tests
export const AUDIO_FILE = path.join(__dirname, 'test-clip-5s.mp3');

// Audio player process (ffplay or mpv)
let audioProcess: ChildProcess | null = null;

/**
 * Start audio playback at the specified position
 * Tries ffplay first (from ffmpeg), then falls back to mpv
 */
export function startAudioPlayback(seekPosition: number = 0): void {
  stopAudioPlayback();

  audioProcess = spawn('ffplay', [
    '-nodisp',
    '-autoexit',
    '-ss', seekPosition.toString(),
    AUDIO_FILE
  ], { stdio: 'ignore' });

  audioProcess.on('error', () => {
    // ffplay not available, try mpv
    audioProcess = spawn('mpv', [
      '--no-video',
      `--start=${seekPosition}`,
      AUDIO_FILE
    ], { stdio: 'ignore' });

    audioProcess.on('error', () => {
      console.error('No audio player found (install ffmpeg or mpv)');
    });
  });
}

/**
 * Stop audio playback
 */
export function stopAudioPlayback(): void {
  if (audioProcess) {
    audioProcess.kill();
    audioProcess = null;
  }
}

/**
 * Waveform audio data from decoded MP3
 */
export interface WaveformData {
  samples: Float32Array;
  sampleRate: number;
  duration: number;
}

/**
 * A single slice of the waveform for visualization
 */
export interface WaveformSlice {
  index: number;
  peak: number;
  rms: number;
  position: number;
}

/**
 * Audio processing utilities for waveform visualization
 */
export class AudioProcessor {
  // Cache waveform data to avoid re-decoding on each test run
  private static cachedWaveform: WaveformData | null = null;

  /**
   * Load and decode the MP3 file to raw PCM samples using ffmpeg
   * Results are cached to speed up subsequent calls (especially in tests)
   */
  static async loadWaveform(): Promise<WaveformData> {
    // Return cached data if available
    if (AudioProcessor.cachedWaveform) {
      return AudioProcessor.cachedWaveform;
    }

    const sampleRate = 44100;

    try {
      // Use ffmpeg to decode MP3 to raw 32-bit float PCM, mono
      const buffer = execSync(
        `ffmpeg -i "${AUDIO_FILE}" -f f32le -acodec pcm_f32le -ac 1 -ar ${sampleRate} - 2>/dev/null`,
        { maxBuffer: 100 * 1024 * 1024 } // 100MB buffer for large files
      );

      // Convert Buffer to Float32Array
      const samples = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
      const duration = samples.length / sampleRate;

      const waveformData = { samples, sampleRate, duration };
      AudioProcessor.cachedWaveform = waveformData;
      return waveformData;
    } catch (error) {
      console.error('Failed to decode MP3 with ffmpeg:', error);
      throw new Error('ffmpeg required to decode MP3. Install with: sudo apt install ffmpeg');
    }
  }

  /**
   * Clear the waveform cache (useful for testing with different audio)
   */
  static clearCache(): void {
    AudioProcessor.cachedWaveform = null;
  }

  /**
   * Downsample waveform data to a target number of slices for visualization
   */
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

/**
 * Format seconds as MM:SS string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Register process cleanup handlers for audio playback
 * Call this once at module load to ensure audio stops on exit
 */
export function registerCleanupHandlers(): void {
  process.on('exit', stopAudioPlayback);
  process.on('SIGINT', () => { stopAudioPlayback(); process.exit(); });
  process.on('SIGTERM', () => { stopAudioPlayback(); process.exit(); });
}

