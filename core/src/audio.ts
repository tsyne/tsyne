/**
 * Audio subsystem for Tsyne
 *
 * API design based on Three.js audio classes (Audio, AudioListener, AudioAnalyser).
 * MIT License — Copyright © 2010-2026 three.js authors
 * https://github.com/mrdoob/three.js/blob/dev/LICENSE
 *
 * Adapted for Tsyne's non-WebAudio environment with two backends:
 * - NodejsAudioBackend: TS-side playback via ffplay/mpv subprocess
 * - BridgeAudioBackend: Go-side playback via oto + go-mp3
 */

import { spawn, ChildProcess } from 'child_process';
import { BridgeInterface } from './fynebridge';

// ============================================================
// IAudioBackend — strategy pattern for audio backends
// ============================================================

export interface IAudioBackend {
  createListener(): string;
  setMasterVolume(listenerId: string, volume: number): void;
  loadAudio(audioId: string, filePath: string): Promise<void>;
  play(audioId: string, delay?: number): void;
  pause(audioId: string): void;
  stop(audioId: string): void;
  setVolume(audioId: string, volume: number): void;
  setLoop(audioId: string, loop: boolean): void;
  setPlaybackRate(audioId: string, rate: number): void;
  getIsPlaying(audioId: string): boolean;
  dispose(audioId: string): void;
}

// ============================================================
// AudioListener — global audio context, master volume
// ============================================================

export class AudioListener {
  readonly id: string;
  private backend: IAudioBackend;
  private _masterVolume = 1.0;

  constructor(backend: IAudioBackend) {
    this.backend = backend;
    this.id = backend.createListener();
  }

  setMasterVolume(value: number): void {
    this._masterVolume = Math.max(0, Math.min(1, value));
    this.backend.setMasterVolume(this.id, this._masterVolume);
  }

  getMasterVolume(): number {
    return this._masterVolume;
  }
}

// ============================================================
// Audio — a single sound source (mirrors Three.js Audio)
// ============================================================

export class Audio {
  readonly id: string;
  private backend: IAudioBackend;
  private listener: AudioListener;
  private _volume = 1.0;
  private _loop = false;
  private _playbackRate = 1.0;
  private _isPlaying = false;
  private _filePath: string | null = null;

  /** Callback invoked when playback ends naturally (not via stop()) */
  onEnded?: () => void;

  private static nextId = 0;

  constructor(listener: AudioListener) {
    this.listener = listener;
    this.backend = (listener as any).backend as IAudioBackend;
    this.id = `audio_${Audio.nextId++}`;
  }

  /**
   * Load an audio file. Replaces Three.js's AudioLoader + setBuffer pattern.
   * @param filePath - Path to the audio file (MP3, WAV, etc.)
   */
  async load(filePath: string): Promise<void> {
    this._filePath = filePath;
    await this.backend.loadAudio(this.id, filePath);
  }

  /**
   * Start playback.
   * @param delay - Optional delay in seconds before playback starts
   */
  play(delay?: number): void {
    if (this._isPlaying) return;
    this._isPlaying = true;
    this.backend.play(this.id, delay);
  }

  /** Pause playback (retains position) */
  pause(): void {
    if (!this._isPlaying) return;
    this._isPlaying = false;
    this.backend.pause(this.id);
  }

  /** Stop playback (resets position to 0) */
  stop(): void {
    this._isPlaying = false;
    this.backend.stop(this.id);
  }

  setVolume(value: number): void {
    this._volume = Math.max(0, Math.min(1, value));
    this.backend.setVolume(this.id, this._volume);
  }

  getVolume(): number {
    return this._volume;
  }

  setLoop(value: boolean): void {
    this._loop = value;
    this.backend.setLoop(this.id, this._loop);
  }

  getLoop(): boolean {
    return this._loop;
  }

  setPlaybackRate(value: number): void {
    this._playbackRate = value;
    this.backend.setPlaybackRate(this.id, this._playbackRate);
  }

  getPlaybackRate(): number {
    return this._playbackRate;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get filePath(): string | null {
    return this._filePath;
  }

  /** Mark playback as ended (called by backend) */
  _markEnded(): void {
    this._isPlaying = false;
    if (this.onEnded) this.onEnded();
  }

  dispose(): void {
    this.stop();
    this.backend.dispose(this.id);
  }
}

// ============================================================
// AudioAnalyser — FFT frequency data (stretch goal)
// ============================================================

export class AudioAnalyser {
  private audio: Audio;
  readonly fftSize: number;
  private _frequencyData: Uint8Array;

  constructor(audio: Audio, fftSize: number = 2048) {
    this.audio = audio;
    this.fftSize = fftSize;
    this._frequencyData = new Uint8Array(fftSize / 2);
  }

  getFrequencyData(): Uint8Array {
    // Stretch goal — returns zeros until FFT pipeline is implemented
    return this._frequencyData;
  }

  getAverageFrequency(): number {
    const data = this._frequencyData;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return data.length > 0 ? sum / data.length : 0;
  }
}

// ============================================================
// NodejsAudioBackend — ffplay/mpv subprocess per Audio instance
// ============================================================

interface NodejsAudioInstance {
  filePath: string;
  volume: number;
  loop: boolean;
  playbackRate: number;
  process: ChildProcess | null;
  startTime: number;       // Date.now() when playback started
  elapsedSec: number;      // accumulated elapsed seconds (for pause/resume)
  onEnded?: () => void;
}

export class NodejsAudioBackend implements IAudioBackend {
  private listeners = new Map<string, { masterVolume: number }>();
  private instances = new Map<string, NodejsAudioInstance>();
  private listenerIdCounter = 0;
  private _masterVolume = 1.0;

  createListener(): string {
    const id = `listener_${this.listenerIdCounter++}`;
    this.listeners.set(id, { masterVolume: 1.0 });
    return id;
  }

  setMasterVolume(listenerId: string, volume: number): void {
    const listener = this.listeners.get(listenerId);
    if (listener) {
      listener.masterVolume = volume;
      this._masterVolume = volume;
    }
  }

  async loadAudio(audioId: string, filePath: string): Promise<void> {
    // If there's already an instance for this ID, dispose it first
    if (this.instances.has(audioId)) {
      this.dispose(audioId);
    }
    this.instances.set(audioId, {
      filePath,
      volume: 1.0,
      loop: false,
      playbackRate: 1.0,
      process: null,
      startTime: 0,
      elapsedSec: 0,
    });
  }

  play(audioId: string, delay?: number): void {
    const inst = this.instances.get(audioId);
    if (!inst) return;

    const doPlay = () => {
      this._spawnPlayer(audioId, inst);
    };

    if (delay && delay > 0) {
      setTimeout(doPlay, delay * 1000);
    } else {
      doPlay();
    }
  }

  pause(audioId: string): void {
    const inst = this.instances.get(audioId);
    if (!inst || !inst.process) return;

    // Record elapsed time
    inst.elapsedSec += (Date.now() - inst.startTime) / 1000;
    this._killProcess(inst);
  }

  stop(audioId: string): void {
    const inst = this.instances.get(audioId);
    if (!inst) return;

    inst.elapsedSec = 0;
    this._killProcess(inst);
  }

  setVolume(audioId: string, volume: number): void {
    const inst = this.instances.get(audioId);
    if (inst) inst.volume = volume;
    // Note: ffplay doesn't support runtime volume changes.
    // The new volume will be applied on next play().
  }

  setLoop(audioId: string, loop: boolean): void {
    const inst = this.instances.get(audioId);
    if (inst) inst.loop = loop;
  }

  setPlaybackRate(audioId: string, rate: number): void {
    const inst = this.instances.get(audioId);
    if (inst) inst.playbackRate = rate;
    // Note: playback rate changes require restarting the player.
    // The new rate will be applied on next play().
  }

  getIsPlaying(audioId: string): boolean {
    const inst = this.instances.get(audioId);
    return inst?.process != null && !inst.process.killed;
  }

  dispose(audioId: string): void {
    const inst = this.instances.get(audioId);
    if (inst) {
      this._killProcess(inst);
      this.instances.delete(audioId);
    }
  }

  /**
   * Seek to a specific position (in seconds) for an audio instance.
   * Stops any current playback — call play() after to resume from the new position.
   */
  seekTo(audioId: string, positionSec: number): void {
    const inst = this.instances.get(audioId);
    if (!inst) return;
    this._killProcess(inst);
    inst.elapsedSec = positionSec;
  }

  /** Dispose all instances (for cleanup) */
  disposeAll(): void {
    for (const [id] of this.instances) {
      this.dispose(id);
    }
    this.listeners.clear();
  }

  private _spawnPlayer(audioId: string, inst: NodejsAudioInstance): void {
    // Kill any existing process
    this._killProcess(inst);

    // Compute effective volume (0-100 for ffplay)
    const effectiveVolume = Math.round(inst.volume * this._masterVolume * 100);

    // Build ffplay args
    const args: string[] = [
      '-nodisp',
      '-autoexit',
      '-volume', effectiveVolume.toString(),
    ];

    // Seek position (for resume after pause)
    if (inst.elapsedSec > 0) {
      args.push('-ss', inst.elapsedSec.toString());
    }

    // Loop
    if (inst.loop) {
      args.push('-loop', '0');
    }

    // Playback rate via audio filter
    if (inst.playbackRate !== 1.0) {
      // atempo supports range 0.5–2.0; chain for wider ranges
      const rate = Math.max(0.5, Math.min(2.0, inst.playbackRate));
      args.push('-af', `atempo=${rate}`);
    }

    args.push(inst.filePath);

    inst.process = spawn('ffplay', args, { stdio: 'ignore' });
    inst.startTime = Date.now();

    inst.process.on('error', () => {
      // ffplay not available — try mpv
      const mpvArgs: string[] = [
        '--no-video',
        `--volume=${effectiveVolume}`,
      ];
      if (inst.elapsedSec > 0) {
        mpvArgs.push(`--start=${inst.elapsedSec}`);
      }
      if (inst.loop) {
        mpvArgs.push('--loop=inf');
      }
      if (inst.playbackRate !== 1.0) {
        mpvArgs.push(`--speed=${inst.playbackRate}`);
      }
      mpvArgs.push(inst.filePath);

      inst.process = spawn('mpv', mpvArgs, { stdio: 'ignore' });
      inst.startTime = Date.now();

      inst.process.on('error', () => {
        console.error('[Audio] No audio player found (install ffmpeg or mpv)');
        inst.process = null;
      });

      inst.process.on('exit', () => {
        inst.process = null;
        if (inst.onEnded) inst.onEnded();
      });
    });

    inst.process.on('exit', () => {
      inst.process = null;
      if (inst.onEnded) inst.onEnded();
    });
  }

  private _killProcess(inst: NodejsAudioInstance): void {
    if (inst.process && !inst.process.killed) {
      inst.process.kill();
    }
    inst.process = null;
  }
}

// ============================================================
// BridgeAudioBackend — sends commands to Go bridge
// ============================================================

export class BridgeAudioBackend implements IAudioBackend {
  private bridge: BridgeInterface;
  private listenerIdCounter = 0;

  constructor(bridge: BridgeInterface) {
    this.bridge = bridge;
  }

  createListener(): string {
    const id = `listener_${this.listenerIdCounter++}`;
    this.bridge.sendFireAndForget('audio.createListener', { listenerId: id });
    return id;
  }

  setMasterVolume(listenerId: string, volume: number): void {
    this.bridge.sendFireAndForget('audio.setMasterVolume', { listenerId, volume });
  }

  async loadAudio(audioId: string, filePath: string): Promise<void> {
    await this.bridge.send('audio.load', { audioId, filePath });
  }

  play(audioId: string, delay?: number): void {
    this.bridge.sendFireAndForget('audio.play', { audioId, delay: delay || 0 });
  }

  pause(audioId: string): void {
    this.bridge.sendFireAndForget('audio.pause', { audioId });
  }

  stop(audioId: string): void {
    this.bridge.sendFireAndForget('audio.stop', { audioId });
  }

  setVolume(audioId: string, volume: number): void {
    this.bridge.sendFireAndForget('audio.setVolume', { audioId, volume });
  }

  setLoop(audioId: string, loop: boolean): void {
    this.bridge.sendFireAndForget('audio.setLoop', { audioId, loop });
  }

  setPlaybackRate(audioId: string, rate: number): void {
    this.bridge.sendFireAndForget('audio.setPlaybackRate', { audioId, rate });
  }

  getIsPlaying(audioId: string): boolean {
    // Bridge calls are async; for synchronous check, we'd need cached state.
    // For now, return false — callers should use Audio.isPlaying which tracks locally.
    return false;
  }

  dispose(audioId: string): void {
    this.bridge.sendFireAndForget('audio.dispose', { audioId });
  }
}
