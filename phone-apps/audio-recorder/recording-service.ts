/**
 * Recording Service
 *
 * Manages audio recording, playback, and storage.
 * Mock implementation for testing and development.
 */

export interface Recording {
  id: string;
  name: string;
  duration: number; // seconds
  size: number; // bytes (approximate)
  sampleRate: number; // Hz
  channels: number;
  createdAt: Date;
  format: 'wav' | 'ogg' | 'mp3';
}

export type RecordingState = 'idle' | 'recording' | 'paused';

export interface IRecordingService {
  // Recording control
  startRecording(name: string): Promise<boolean>;
  stopRecording(): Promise<Recording | null>;
  pauseRecording(): Promise<void>;
  resumeRecording(): Promise<void>;

  // Playback
  playRecording(id: string): Promise<boolean>;
  stopPlayback(): Promise<void>;
  pausePlayback(): Promise<void>;
  resumePlayback(): Promise<void>;

  // State queries
  getRecordingState(): RecordingState;
  isPlaying(): boolean;
  getCurrentRecordingDuration(): number; // seconds
  getPlaybackPosition(): number; // seconds

  // Library
  getRecordings(): Recording[];
  getRecording(id: string): Recording | null;
  deleteRecording(id: string): boolean;
  renameRecording(id: string, newName: string): boolean;

  // Settings
  setQuality(quality: 'low' | 'medium' | 'high'): void;
  getQuality(): 'low' | 'medium' | 'high';
  setSampleRate(rate: number): void;
  getSampleRate(): number;

  // Listeners
  onRecordingStateChanged(callback: (state: RecordingState) => void): () => void;
  onRecordingDurationChanged(callback: (duration: number) => void): () => void;
  onPlaybackPositionChanged(callback: (position: number) => void): () => void;

  // Export/Import
  exportRecording(id: string, format: 'wav' | 'ogg' | 'mp3'): Promise<string>; // returns path
}

/**
 * Mock Recording Service for testing
 */
export class MockRecordingService implements IRecordingService {
  private recordingState: RecordingState = 'idle';
  private isPlayingNow = false;
  private currentRecordingDuration = 0;
  private playbackPosition = 0;
  private quality: 'low' | 'medium' | 'high' = 'high';
  private sampleRate = 44100;
  private recordings: Map<string, Recording> = new Map();
  private nextId = 1;
  private recordingTimer: NodeJS.Timeout | null = null;
  private playbackTimer: NodeJS.Timeout | null = null;
  private recordingListeners: Array<(state: RecordingState) => void> = [];
  private durationListeners: Array<(duration: number) => void> = [];
  private playbackListeners: Array<(position: number) => void> = [];

  constructor() {
    this.initializeSampleRecordings();
  }

  private initializeSampleRecordings(): void {
    this.recordings.set('rec-1', {
      id: 'rec-1',
      name: 'Meeting Notes',
      duration: 342,
      size: 1024 * 512,
      sampleRate: 44100,
      channels: 1,
      createdAt: new Date(Date.now() - 86400000),
      format: 'wav',
    });

    this.recordings.set('rec-2', {
      id: 'rec-2',
      name: 'Voice Memo',
      duration: 125,
      size: 1024 * 192,
      sampleRate: 44100,
      channels: 1,
      createdAt: new Date(Date.now() - 3600000),
      format: 'ogg',
    });

    this.recordings.set('rec-3', {
      id: 'rec-3',
      name: 'Phone Interview',
      duration: 876,
      size: 1024 * 1344,
      sampleRate: 16000,
      channels: 1,
      createdAt: new Date(Date.now() - 7200000),
      format: 'mp3',
    });
  }

  async startRecording(name: string): Promise<boolean> {
    if (this.recordingState !== 'idle') return false;

    this.recordingState = 'recording';
    this.currentRecordingDuration = 0;
    this.recordingTimer = setInterval(() => {
      this.currentRecordingDuration += 1;
      this.notifyDurationChanged();
    }, 1000);

    this.notifyRecordingStateChanged();
    console.log(`[MockRecording] Started recording: ${name}`);
    return true;
  }

  async stopRecording(): Promise<Recording | null> {
    if (this.recordingState === 'idle') return null;

    this.stopRecordingTimer();

    const recording: Recording = {
      id: `rec-${this.nextId++}`,
      name: `Recording ${this.nextId}`,
      duration: this.currentRecordingDuration,
      size: Math.ceil((this.currentRecordingDuration * this.sampleRate * 2) / 8), // approximate
      sampleRate: this.sampleRate,
      channels: 1,
      createdAt: new Date(),
      format: 'wav',
    };

    this.recordings.set(recording.id, recording);
    this.recordingState = 'idle';
    this.currentRecordingDuration = 0;

    this.notifyRecordingStateChanged();
    this.notifyDurationChanged();
    console.log(`[MockRecording] Stopped recording: ${recording.name}`);

    return recording;
  }

  async pauseRecording(): Promise<void> {
    if (this.recordingState !== 'recording') return;
    this.recordingState = 'paused';
    this.stopRecordingTimer();
    this.notifyRecordingStateChanged();
    console.log('[MockRecording] Recording paused');
  }

  async resumeRecording(): Promise<void> {
    if (this.recordingState !== 'paused') return;
    this.recordingState = 'recording';
    this.recordingTimer = setInterval(() => {
      this.currentRecordingDuration += 1;
      this.notifyDurationChanged();
    }, 1000);
    this.notifyRecordingStateChanged();
    console.log('[MockRecording] Recording resumed');
  }

  async playRecording(id: string): Promise<boolean> {
    const recording = this.recordings.get(id);
    if (!recording) return false;

    this.isPlayingNow = true;
    this.playbackPosition = 0;
    this.playbackTimer = setInterval(() => {
      this.playbackPosition += 1;
      this.notifyPlaybackPositionChanged();

      if (this.playbackPosition >= recording.duration) {
        this.stopPlayback();
      }
    }, 1000);

    console.log(`[MockRecording] Playing: ${recording.name}`);
    return true;
  }

  async stopPlayback(): Promise<void> {
    if (!this.isPlayingNow) return;
    this.isPlayingNow = false;
    this.playbackPosition = 0;
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.notifyPlaybackPositionChanged();
    console.log('[MockRecording] Playback stopped');
  }

  async pausePlayback(): Promise<void> {
    if (!this.isPlayingNow) return;
    this.isPlayingNow = false;
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    console.log('[MockRecording] Playback paused');
  }

  async resumePlayback(): Promise<void> {
    if (this.isPlayingNow) return;
    this.isPlayingNow = true;
    this.playbackTimer = setInterval(() => {
      this.playbackPosition += 1;
      this.notifyPlaybackPositionChanged();
    }, 1000);
    console.log('[MockRecording] Playback resumed');
  }

  getRecordingState(): RecordingState {
    return this.recordingState;
  }

  isPlaying(): boolean {
    return this.isPlayingNow;
  }

  getCurrentRecordingDuration(): number {
    return this.currentRecordingDuration;
  }

  getPlaybackPosition(): number {
    return this.playbackPosition;
  }

  setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.quality = quality;
  }

  getQuality(): 'low' | 'medium' | 'high' {
    return this.quality;
  }

  setSampleRate(rate: number): void {
    this.sampleRate = rate;
  }

  getSampleRate(): number {
    return this.sampleRate;
  }

  getRecordings(): Recording[] {
    return Array.from(this.recordings.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getRecording(id: string): Recording | null {
    return this.recordings.get(id) || null;
  }

  deleteRecording(id: string): boolean {
    return this.recordings.delete(id);
  }

  renameRecording(id: string, newName: string): boolean {
    const recording = this.recordings.get(id);
    if (!recording) return false;
    recording.name = newName;
    return true;
  }

  onRecordingStateChanged(callback: (state: RecordingState) => void): () => void {
    this.recordingListeners.push(callback);
    return () => {
      const idx = this.recordingListeners.indexOf(callback);
      if (idx >= 0) this.recordingListeners.splice(idx, 1);
    };
  }

  onRecordingDurationChanged(callback: (duration: number) => void): () => void {
    this.durationListeners.push(callback);
    return () => {
      const idx = this.durationListeners.indexOf(callback);
      if (idx >= 0) this.durationListeners.splice(idx, 1);
    };
  }

  onPlaybackPositionChanged(callback: (position: number) => void): () => void {
    this.playbackListeners.push(callback);
    return () => {
      const idx = this.playbackListeners.indexOf(callback);
      if (idx >= 0) this.playbackListeners.splice(idx, 1);
    };
  }

  async exportRecording(id: string, format: 'wav' | 'ogg' | 'mp3'): Promise<string> {
    const recording = this.recordings.get(id);
    if (!recording) throw new Error('Recording not found');
    const path = `/tmp/${recording.name}.${format}`;
    console.log(`[MockRecording] Exported to: ${path}`);
    return path;
  }

  private stopRecordingTimer(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  private notifyRecordingStateChanged(): void {
    for (const listener of this.recordingListeners) {
      listener(this.recordingState);
    }
  }

  private notifyDurationChanged(): void {
    for (const listener of this.durationListeners) {
      listener(this.currentRecordingDuration);
    }
  }

  private notifyPlaybackPositionChanged(): void {
    for (const listener of this.playbackListeners) {
      listener(this.playbackPosition);
    }
  }

  destroy(): void {
    this.stopRecordingTimer();
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
    }
  }
}
