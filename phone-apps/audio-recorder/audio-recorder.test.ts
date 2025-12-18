/*
 * Copyright (c) 2025 Paul Hammant
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

/**
 * Tests for Audio Recorder App
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createAudioRecorderApp } from './audio-recorder';
import { MockRecordingService } from './recording-service';

describe('Audio Recorder App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let recording: MockRecordingService;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    recording = new MockRecordingService();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
    recording.destroy();
  });

  test('should display app title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createAudioRecorderApp(app, recording);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('recorder-title').within(500).shouldExist();
  });

  test('should display time display', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createAudioRecorderApp(app, recording);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial time should be 0:00
    await ctx.getByID('time-display').within(500).shouldBe('0:00');
  });

  test('should display status label', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createAudioRecorderApp(app, recording);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('recorder-status').within(500).shouldBe('Ready');
  });

  test('should have record button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createAudioRecorderApp(app, recording);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-record').within(500).shouldExist();
  });

  test('should have pause button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createAudioRecorderApp(app, recording);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-pause').within(500).shouldExist();
  });

  test('should have quality selector', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createAudioRecorderApp(app, recording);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-quality').within(500).shouldExist();
  });

  test('should display recordings list', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createAudioRecorderApp(app, recording);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Recordings label should exist
    await ctx.getByID('label-recordings').within(500).shouldExist();
  });

  test('should start recording when record button clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createAudioRecorderApp(app, recording);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state should be idle
    expect(recording.getRecordingState()).toBe('idle');

    // Click record button
    await ctx.getByID('btn-record').click();

    // Should be recording
    expect(recording.getRecordingState()).toBe('recording');
  });

  test('should pause recording', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createAudioRecorderApp(app, recording);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start recording
    await ctx.getByID('btn-record').click();
    expect(recording.getRecordingState()).toBe('recording');

    // Pause recording
    await ctx.getByID('btn-pause').click();
    expect(recording.getRecordingState()).toBe('paused');
  });

  test('should take screenshot for documentation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createAudioRecorderApp(app, recording);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start recording
    await ctx.getByID('btn-record').click();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshot = await ctx.screenshot();
      console.log(`Audio Recorder screenshot saved: ${screenshot}`);
    }
  });
});

/**
 * Unit tests for MockRecordingService
 */
describe('MockRecordingService', () => {
  let service: MockRecordingService;

  beforeEach(() => {
    service = new MockRecordingService();
  });

  afterEach(() => {
    service.destroy();
  });

  test('should initialize in idle state', () => {
    expect(service.getRecordingState()).toBe('idle');
    expect(service.isPlaying()).toBe(false);
  });

  test('should start recording', async () => {
    const result = await service.startRecording('Test');
    expect(result).toBe(true);
    expect(service.getRecordingState()).toBe('recording');
  });

  test('should stop recording', async () => {
    await service.startRecording('Test');
    const recording = await service.stopRecording();

    expect(recording).toBeDefined();
    expect(recording?.name).toBeDefined();
    expect(service.getRecordingState()).toBe('idle');
  });

  test('should pause recording', async () => {
    await service.startRecording('Test');
    await service.pauseRecording();

    expect(service.getRecordingState()).toBe('paused');
  });

  test('should resume recording', async () => {
    await service.startRecording('Test');
    await service.pauseRecording();
    await service.resumeRecording();

    expect(service.getRecordingState()).toBe('recording');
  });

  test('should track recording duration', async () => {
    await service.startRecording('Test');
    await new Promise(resolve => setTimeout(resolve, 2100)); // Wait 2+ seconds

    const duration = service.getCurrentRecordingDuration();
    expect(duration).toBeGreaterThanOrEqual(2);
  });

  test('should play recording', async () => {
    const recordings = service.getRecordings();
    const firstRecording = recordings[0];

    const result = await service.playRecording(firstRecording.id);
    expect(result).toBe(true);
    expect(service.isPlaying()).toBe(true);
  });

  test('should stop playback', async () => {
    const recordings = service.getRecordings();
    await service.playRecording(recordings[0].id);

    await service.stopPlayback();
    expect(service.isPlaying()).toBe(false);
    expect(service.getPlaybackPosition()).toBe(0);
  });

  test('should pause playback', async () => {
    const recordings = service.getRecordings();
    await service.playRecording(recordings[0].id);

    await service.pausePlayback();
    expect(service.isPlaying()).toBe(false);
  });

  test('should resume playback', async () => {
    const recordings = service.getRecordings();
    await service.playRecording(recordings[0].id);
    await service.pausePlayback();

    await service.resumePlayback();
    expect(service.isPlaying()).toBe(true);
  });

  test('should return all recordings', () => {
    const recordings = service.getRecordings();
    expect(Array.isArray(recordings)).toBe(true);
    expect(recordings.length).toBeGreaterThan(0);
  });

  test('should get recording by id', () => {
    const recordings = service.getRecordings();
    const recording = service.getRecording(recordings[0].id);

    expect(recording).toBeDefined();
    expect(recording?.id).toBe(recordings[0].id);
  });

  test('should delete recording', () => {
    const recordings = service.getRecordings();
    const beforeCount = recordings.length;

    const result = service.deleteRecording(recordings[0].id);
    const afterCount = service.getRecordings().length;

    expect(result).toBe(true);
    expect(afterCount).toBe(beforeCount - 1);
  });

  test('should rename recording', () => {
    const recordings = service.getRecordings();
    const recording = recordings[0];

    const result = service.renameRecording(recording.id, 'New Name');
    expect(result).toBe(true);
    expect(service.getRecording(recording.id)?.name).toBe('New Name');
  });

  test('should set quality', () => {
    service.setQuality('low');
    expect(service.getQuality()).toBe('low');

    service.setQuality('medium');
    expect(service.getQuality()).toBe('medium');

    service.setQuality('high');
    expect(service.getQuality()).toBe('high');
  });

  test('should set sample rate', () => {
    service.setSampleRate(16000);
    expect(service.getSampleRate()).toBe(16000);

    service.setSampleRate(48000);
    expect(service.getSampleRate()).toBe(48000);
  });

  test('should notify on recording state changes', async () => {
    const states: string[] = [];
    service.onRecordingStateChanged((state) => states.push(state));

    await service.startRecording('Test');
    expect(states).toContain('recording');

    await service.pauseRecording();
    expect(states).toContain('paused');

    await service.resumeRecording();
    expect(states).toContain('recording');

    await service.stopRecording();
    expect(states).toContain('idle');
  });

  test('should notify on duration changes', async () => {
    const durations: number[] = [];
    service.onRecordingDurationChanged((duration) => durations.push(duration));

    await service.startRecording('Test');
    await new Promise(resolve => setTimeout(resolve, 2100));

    expect(durations.length).toBeGreaterThan(0);
    expect(durations[durations.length - 1]).toBeGreaterThanOrEqual(2);
  });

  test('should export recording', async () => {
    const recordings = service.getRecordings();
    const path = await service.exportRecording(recordings[0].id, 'wav');

    expect(path).toContain('.wav');
  });
});
