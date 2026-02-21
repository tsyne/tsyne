/**
 * Audio subsystem unit tests
 *
 * Tests for AudioListener, Audio, AudioAnalyser classes
 * and NodejsAudioBackend (with mocked child_process).
 */

import { AudioListener, Audio, AudioAnalyser, NodejsAudioBackend, IAudioBackend } from '../audio';

// ============================================================
// Mock backend for testing Audio/AudioListener classes
// ============================================================

class MockAudioBackend implements IAudioBackend {
  calls: Array<{ method: string; args: any[] }> = [];
  private listenerIdCounter = 0;

  createListener(): string {
    const id = `mock_listener_${this.listenerIdCounter++}`;
    this.calls.push({ method: 'createListener', args: [] });
    return id;
  }

  setMasterVolume(listenerId: string, volume: number): void {
    this.calls.push({ method: 'setMasterVolume', args: [listenerId, volume] });
  }

  async loadAudio(audioId: string, filePath: string): Promise<void> {
    this.calls.push({ method: 'loadAudio', args: [audioId, filePath] });
  }

  play(audioId: string, delay?: number): void {
    this.calls.push({ method: 'play', args: [audioId, delay] });
  }

  pause(audioId: string): void {
    this.calls.push({ method: 'pause', args: [audioId] });
  }

  stop(audioId: string): void {
    this.calls.push({ method: 'stop', args: [audioId] });
  }

  setVolume(audioId: string, volume: number): void {
    this.calls.push({ method: 'setVolume', args: [audioId, volume] });
  }

  setLoop(audioId: string, loop: boolean): void {
    this.calls.push({ method: 'setLoop', args: [audioId, loop] });
  }

  setPlaybackRate(audioId: string, rate: number): void {
    this.calls.push({ method: 'setPlaybackRate', args: [audioId, rate] });
  }

  getIsPlaying(audioId: string): boolean {
    this.calls.push({ method: 'getIsPlaying', args: [audioId] });
    return false;
  }

  dispose(audioId: string): void {
    this.calls.push({ method: 'dispose', args: [audioId] });
  }
}

// ============================================================
// AudioListener tests
// ============================================================

describe('AudioListener', () => {
  let backend: MockAudioBackend;

  beforeEach(() => {
    backend = new MockAudioBackend();
  });

  it('should create a listener via the backend', () => {
    const listener = new AudioListener(backend);
    expect(listener.id).toMatch(/^mock_listener_/);
    expect(backend.calls[0].method).toBe('createListener');
  });

  it('should get/set master volume', () => {
    const listener = new AudioListener(backend);
    expect(listener.getMasterVolume()).toBe(1.0);

    listener.setMasterVolume(0.5);
    expect(listener.getMasterVolume()).toBe(0.5);
    expect(backend.calls).toContainEqual({
      method: 'setMasterVolume',
      args: [listener.id, 0.5],
    });
  });

  it('should clamp volume to [0, 1]', () => {
    const listener = new AudioListener(backend);
    listener.setMasterVolume(-0.5);
    expect(listener.getMasterVolume()).toBe(0);

    listener.setMasterVolume(1.5);
    expect(listener.getMasterVolume()).toBe(1);
  });
});

// ============================================================
// Audio tests
// ============================================================

describe('Audio', () => {
  let backend: MockAudioBackend;
  let listener: AudioListener;

  beforeEach(() => {
    backend = new MockAudioBackend();
    listener = new AudioListener(backend);
  });

  it('should create an Audio instance with unique ID', () => {
    const sound1 = new Audio(listener);
    const sound2 = new Audio(listener);
    expect(sound1.id).not.toBe(sound2.id);
    expect(sound1.id).toMatch(/^audio_/);
  });

  it('should load an audio file', async () => {
    const sound = new Audio(listener);
    await sound.load('/path/to/test.mp3');
    expect(sound.filePath).toBe('/path/to/test.mp3');
    expect(backend.calls).toContainEqual({
      method: 'loadAudio',
      args: [sound.id, '/path/to/test.mp3'],
    });
  });

  it('should play and track isPlaying state', () => {
    const sound = new Audio(listener);
    expect(sound.isPlaying).toBe(false);

    sound.play();
    expect(sound.isPlaying).toBe(true);
    expect(backend.calls).toContainEqual({
      method: 'play',
      args: [sound.id, undefined],
    });
  });

  it('should not double-play', () => {
    const sound = new Audio(listener);
    sound.play();
    sound.play(); // second call should be ignored

    const playCalls = backend.calls.filter(c => c.method === 'play');
    expect(playCalls).toHaveLength(1);
  });

  it('should pause', () => {
    const sound = new Audio(listener);
    sound.play();
    sound.pause();
    expect(sound.isPlaying).toBe(false);
    expect(backend.calls).toContainEqual({
      method: 'pause',
      args: [sound.id],
    });
  });

  it('should not pause if not playing', () => {
    const sound = new Audio(listener);
    sound.pause(); // should be ignored
    const pauseCalls = backend.calls.filter(c => c.method === 'pause');
    expect(pauseCalls).toHaveLength(0);
  });

  it('should stop', () => {
    const sound = new Audio(listener);
    sound.play();
    sound.stop();
    expect(sound.isPlaying).toBe(false);
    expect(backend.calls).toContainEqual({
      method: 'stop',
      args: [sound.id],
    });
  });

  it('should play with delay', () => {
    const sound = new Audio(listener);
    sound.play(0.5);
    expect(backend.calls).toContainEqual({
      method: 'play',
      args: [sound.id, 0.5],
    });
  });

  it('should get/set volume', () => {
    const sound = new Audio(listener);
    expect(sound.getVolume()).toBe(1.0);

    sound.setVolume(0.7);
    expect(sound.getVolume()).toBe(0.7);
    expect(backend.calls).toContainEqual({
      method: 'setVolume',
      args: [sound.id, 0.7],
    });
  });

  it('should clamp volume to [0, 1]', () => {
    const sound = new Audio(listener);
    sound.setVolume(2.0);
    expect(sound.getVolume()).toBe(1.0);

    sound.setVolume(-1.0);
    expect(sound.getVolume()).toBe(0);
  });

  it('should get/set loop', () => {
    const sound = new Audio(listener);
    expect(sound.getLoop()).toBe(false);

    sound.setLoop(true);
    expect(sound.getLoop()).toBe(true);
    expect(backend.calls).toContainEqual({
      method: 'setLoop',
      args: [sound.id, true],
    });
  });

  it('should get/set playback rate', () => {
    const sound = new Audio(listener);
    expect(sound.getPlaybackRate()).toBe(1.0);

    sound.setPlaybackRate(1.5);
    expect(sound.getPlaybackRate()).toBe(1.5);
    expect(backend.calls).toContainEqual({
      method: 'setPlaybackRate',
      args: [sound.id, 1.5],
    });
  });

  it('should call onEnded when _markEnded is called', () => {
    const sound = new Audio(listener);
    let endedCalled = false;
    sound.onEnded = () => { endedCalled = true; };

    sound.play();
    expect(sound.isPlaying).toBe(true);

    sound._markEnded();
    expect(sound.isPlaying).toBe(false);
    expect(endedCalled).toBe(true);
  });

  it('should dispose', () => {
    const sound = new Audio(listener);
    sound.play();
    sound.dispose();
    expect(sound.isPlaying).toBe(false);
    expect(backend.calls).toContainEqual({
      method: 'dispose',
      args: [sound.id],
    });
  });
});

// ============================================================
// AudioAnalyser tests
// ============================================================

describe('AudioAnalyser', () => {
  let backend: MockAudioBackend;
  let listener: AudioListener;

  beforeEach(() => {
    backend = new MockAudioBackend();
    listener = new AudioListener(backend);
  });

  it('should create with default fftSize', () => {
    const sound = new Audio(listener);
    const analyser = new AudioAnalyser(sound);
    expect(analyser.fftSize).toBe(2048);
  });

  it('should create with custom fftSize', () => {
    const sound = new Audio(listener);
    const analyser = new AudioAnalyser(sound, 1024);
    expect(analyser.fftSize).toBe(1024);
  });

  it('should return zeroed frequency data (stub)', () => {
    const sound = new Audio(listener);
    const analyser = new AudioAnalyser(sound, 256);
    const data = analyser.getFrequencyData();
    expect(data.length).toBe(128); // fftSize / 2
    expect(data.every(v => v === 0)).toBe(true);
  });

  it('should return 0 average frequency (stub)', () => {
    const sound = new Audio(listener);
    const analyser = new AudioAnalyser(sound);
    expect(analyser.getAverageFrequency()).toBe(0);
  });
});

// ============================================================
// NodejsAudioBackend tests (mocked spawn)
// ============================================================

describe('NodejsAudioBackend', () => {
  let backend: NodejsAudioBackend;

  beforeEach(() => {
    backend = new NodejsAudioBackend();
  });

  afterEach(() => {
    backend.disposeAll();
  });

  it('should create a listener', () => {
    const id = backend.createListener();
    expect(id).toMatch(/^listener_/);
  });

  it('should load audio (register instance)', async () => {
    await backend.loadAudio('test1', '/path/to/audio.mp3');
    // No error means success; instance is registered internally
    expect(backend.getIsPlaying('test1')).toBe(false);
  });

  it('should report not playing for unknown IDs', () => {
    expect(backend.getIsPlaying('nonexistent')).toBe(false);
  });

  it('should set volume on instance', async () => {
    await backend.loadAudio('test1', '/path/to/audio.mp3');
    backend.setVolume('test1', 0.5);
    // Volume is stored internally — no way to query it directly,
    // but this should not throw
  });

  it('should set loop on instance', async () => {
    await backend.loadAudio('test1', '/path/to/audio.mp3');
    backend.setLoop('test1', true);
  });

  it('should set playback rate on instance', async () => {
    await backend.loadAudio('test1', '/path/to/audio.mp3');
    backend.setPlaybackRate('test1', 1.5);
  });

  it('should dispose an instance', async () => {
    await backend.loadAudio('test1', '/path/to/audio.mp3');
    backend.dispose('test1');
    expect(backend.getIsPlaying('test1')).toBe(false);
  });

  it('should dispose all instances', async () => {
    await backend.loadAudio('test1', '/a.mp3');
    await backend.loadAudio('test2', '/b.mp3');
    backend.disposeAll();
    expect(backend.getIsPlaying('test1')).toBe(false);
    expect(backend.getIsPlaying('test2')).toBe(false);
  });

  it('should handle stop on unloaded audio gracefully', () => {
    backend.stop('nonexistent'); // should not throw
  });

  it('should handle pause on unloaded audio gracefully', () => {
    backend.pause('nonexistent'); // should not throw
  });
});
