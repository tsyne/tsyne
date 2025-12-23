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
 * Audio Recorder App
 *
 * Record, playback, and manage audio recordings.
 * Implements pseudo-declarative pattern following calculator.ts style.
 *
 * @tsyne-app:name Audio Recorder
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3s-3 1.34-3 3v6c0 1.66 1.34 3 3 3z"/><path d="M17 16.91c-1.48 1.46-3.51 2.36-5.77 2.36-2.26 0-4.29-.9-5.77-2.36M19 12h2c0 .91-.24 1.75-.67 2.5M5 12H3c0-.91.24-1.75.67-2.5"/></svg>
 * @tsyne-app:category media
 * @tsyne-app:builder createAudioRecorderApp
 * @tsyne-app:args app,recording
 * @tsyne-app:count single
 */

import { app, resolveTransport, styles, FontStyle  } from '../../core/src';
import type { App } from '../../core/src';
import type { Window } from '../../core/src';
import type { Label } from '../../core/src';
import type { VBox } from '../../core/src';
import { IRecordingService, MockRecordingService, Recording } from './recording-service';

// Define recorder styles
styles({
  'recorder-title': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 24,
  },
  'recorder-time': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 32,
  },
  'recorder-status': {
    text_align: 'center',
    font_size: 14,
  },
});

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Build the audio recorder UI - Pseudo-declarative style
 */
export function createAudioRecorderApp(a: App, recording: IRecordingService): void {
  // Instance-local state
  let timeDisplay: Label | undefined;
  let statusLabel: Label | undefined;
  let recordButton: any = undefined;
  let playButton: any = undefined;
  let recordingsList: VBox | undefined;
  let currentPlayingId: string | null = null;

  // Subscribe to recording service events
  const unsubscribeState = recording.onRecordingStateChanged(() => updateUI());
  const unsubscribeDuration = recording.onRecordingDurationChanged(() => updateTimeDisplay());
  const unsubscribePlayback = recording.onPlaybackPositionChanged(() => updateTimeDisplay());

  function updateUI() {
    const state = recording.getRecordingState();

    // Update record button
    if (recordButton) {
      if (state === 'recording') {
        recordButton.setText('⏹ Stop');
      } else if (state === 'paused') {
        recordButton.setText('⏸ Resume');
      } else {
        recordButton.setText('● Record');
      }
    }

    // Update status
    if (statusLabel) {
      statusLabel.setText(state === 'idle' ? 'Ready' : state === 'recording' ? 'Recording...' : 'Paused');
    }
  }

  function updateTimeDisplay() {
    if (recording.getRecordingState() !== 'idle') {
      const duration = recording.getCurrentRecordingDuration();
      if (timeDisplay) timeDisplay.setText(formatTime(duration));
    } else if (currentPlayingId && recording.isPlaying()) {
      const position = recording.getPlaybackPosition();
      if (timeDisplay) timeDisplay.setText(formatTime(position));
    }
  }

  function updateRecordingsList() {
    if (!recordingsList) return;

    // Simplified rebuild of recordings list
    recordingsList.destroyChildren?.();

    const recordings = recording.getRecordings();
    recordings.forEach((rec, index) => {
      a.hbox(() => {
        // Recording info
        a.vbox(() => {
          a.label(rec.name).withId(`rec-${rec.id}-name`);
          a.label(`${formatTime(rec.duration)} • ${(rec.size / 1024).toFixed(0)}KB`).withId(`rec-${rec.id}-info`);
        });

        a.spacer();

        // Playback button
        a.button('▶').onClick(() => {
          if (currentPlayingId === rec.id && recording.isPlaying()) {
            recording.pausePlayback();
          } else {
            recording.playRecording(rec.id);
            currentPlayingId = rec.id;
          }
        }).withId(`rec-${rec.id}-play`);

        // Delete button
        a.button('🗑').onClick(() => {
          recording.deleteRecording(rec.id);
          updateRecordingsList();
        }).withId(`rec-${rec.id}-delete`);
      });
    });

    if (recordings.length === 0) {
      a.label('No recordings yet');
    }
  }

  a.window({ title: 'Audio Recorder', width: 400, height: 600 }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.label('🎙 Audio Recorder').withId('recorder-title');

        a.separator();

        // Time display (large)
        timeDisplay = a.label('0:00').withId('time-display');

        // Status
        statusLabel = a.label('Ready').withId('recorder-status');

        a.separator();

        // Record control buttons
        a.hbox(() => {
          recordButton = a.button('● Record')
            .onClick(async () => {
              const state = recording.getRecordingState();
              if (state === 'idle') {
                await recording.startRecording('Recording');
              } else if (state === 'recording') {
                const rec = await recording.stopRecording();
                if (rec) {
                  updateRecordingsList();
                  if (timeDisplay) timeDisplay.setText('0:00');
                }
              } else if (state === 'paused') {
                await recording.resumeRecording();
              }
            })
            .withId('btn-record');

          a.spacer();

          a.button('⏸ Pause')
            .onClick(async () => {
              if (recording.getRecordingState() === 'recording') {
                await recording.pauseRecording();
              }
            })
            .withId('btn-pause');
        });

        a.separator();

        // Recording quality selector
        a.hbox(() => {
          a.label('Quality: ').withId('label-quality');

          const qualityBtn = a.button(recording.getQuality().charAt(0).toUpperCase() + recording.getQuality().slice(1))
            .onClick(() => {
              const qualities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
              const current = recording.getQuality();
              const idx = qualities.indexOf(current);
              const next = qualities[(idx + 1) % qualities.length];
              recording.setQuality(next);
              qualityBtn.setText(next.charAt(0).toUpperCase() + next.slice(1));
            })
            .withId('btn-quality');
        });

        a.separator();

        // Recordings list
        a.label('Recordings').withId('label-recordings');

        a.scroll(() => {
          recordingsList = a.vbox(() => {
            // Recordings will be rendered by updateRecordingsList()
          }) as any;
        });
      });
    });

    win.show();

    // Initial display
    updateUI();
    updateRecordingsList();
  });

  // Cleanup function
  const cleanup = () => {
    unsubscribeState();
    unsubscribeDuration();
    unsubscribePlayback();
  };

  return cleanup as any;
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Audio Recorder' }, (a: App) => {
    const recordingService = new MockRecordingService();
    createAudioRecorderApp(a, recordingService);
  });
}
