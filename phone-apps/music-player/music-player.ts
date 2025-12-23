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
 * Music Player App
 *
 * A music player with playback controls, playlist management, and search.
 * Implements pseudo-declarative pattern following calculator.ts style.
 *
 * @tsyne-app:name Music Player
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v9.28c-.47-.46-1.12-.75-1.84-.75-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V7h4V3h-5zm8-2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2z"/></svg>
 * @tsyne-app:category media
 * @tsyne-app:builder createMusicPlayerApp
 * @tsyne-app:args app,music
 * @tsyne-app:count single
 */

import { app, resolveTransport, styles, FontStyle  } from '../../core/src';
import type { App } from '../../core/src';
import type { Window } from '../../core/src';
import type { Label } from '../../core/src';
import type { VBox } from '../../core/src';
import { IMusicService, MockMusicService, Track, PlaybackState } from './music-service';

// Define player styles
styles({
  'player-title': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 24,
  },
  'player-track': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 20,
  },
  'player-artist': {
    text_align: 'center',
    font_size: 16,
  },
  'player-time': {
    text_align: 'center',
    font_size: 12,
  },
});

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Build the music player UI - Pseudo-declarative style
 */
export function createMusicPlayerApp(a: App, music: IMusicService): void {
  // Instance-local state
  let titleLabel: Label | undefined;
  let artistLabel: Label | undefined;
  let timeLabel: Label | undefined;
  let statusLabel: Label | undefined;
  let playButton: any = undefined;
  let playlistContainer: VBox | undefined;
  let searchQuery = '';

  // Subscribe to music service events
  const unsubscribePlayback = music.onPlaybackStateChanged(() => updatePlayButton());
  const unsubscribeTrack = music.onTrackChanged(() => updateTrackDisplay());
  const unsubscribePosition = music.onPositionChanged(() => updateTimeDisplay());

  function updateTrackDisplay() {
    const track = music.getCurrentTrack();
    if (titleLabel) titleLabel.setText(track?.title || 'No track');
    if (artistLabel) artistLabel.setText(track ? `${track.artist} - ${track.album}` : 'Select a track');
  }

  function updateTimeDisplay() {
    const position = music.getCurrentPosition();
    const duration = music.getDuration();
    if (timeLabel) timeLabel.setText(`${formatTime(position)} / ${formatTime(duration)}`);
  }

  function updatePlayButton() {
    if (playButton) {
      const state = music.getPlaybackState();
      playButton.setText(state === 'playing' ? '⏸ Pause' : '▶ Play');
    }
  }

  function updatePlaylist() {
    if (!playlistContainer) return;
    const tracks = searchQuery ? music.search(searchQuery) : music.getTracks();

    // Rebuild playlist (simplified approach)
    playlistContainer.destroyChildren?.();

    tracks.forEach((track, index) => {
      const isPlaying = music.getCurrentTrack()?.id === track.id && music.getPlaybackState() === 'playing';
      const prefix = isPlaying ? '▶ ' : '  ';

      a.hbox(() => {
        a.label(`${prefix}${track.title}`)
          .withId(`track-${track.id}-title`);
        a.spacer();
        a.label(formatTime(track.duration))
          .withId(`track-${track.id}-duration`);
        a.button('▶').onClick(() => {
          music.loadTracks([track, ...tracks.filter(t => t.id !== track.id)]);
          music.play();
        }).withId(`track-${track.id}-btn`);
      });
    });

    if (tracks.length === 0) {
      a.label(searchQuery ? 'No matches found' : 'No tracks');
    }
  }

  a.window({ title: 'Music Player', width: 400, height: 600 }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.label('🎵 Music Player').withId('player-title');

        a.separator();

        // Now playing display
        titleLabel = a.label('No track').withId('now-playing-title');
        artistLabel = a.label('Select a track').withId('now-playing-artist');
        timeLabel = a.label('0:00 / 0:00').withId('player-time');

        a.separator();

        // Playback controls
        a.hbox(() => {
          a.button('⏮ Prev').onClick(() => {
            music.previous();
            updateTrackDisplay();
          }).withId('btn-previous');

          playButton = a.button('▶ Play')
            .onClick(() => {
              const state = music.getPlaybackState();
              if (state === 'playing') {
                music.pause();
              } else {
                music.play();
              }
            })
            .withId('btn-play');

          a.button('Next ⏭').onClick(() => {
            music.next();
            updateTrackDisplay();
          }).withId('btn-next');
        });

        // Volume control
        a.hbox(() => {
          a.label('🔊 Vol:').withId('label-volume');
          a.spacer();
          const volLabel = a.label(`${music.getVolume()}%`).withId('volume-display');
          a.slider(music.getVolume(), (value) => {
            music.setVolume(value);
            volLabel.setText(`${value}%`);
          }).withId('volume-slider');
        });

        // Shuffle and repeat buttons
        a.hbox(() => {
          const shuffleBtn = a.button(music.getShuffle() ? '🔀 On' : '🔀 Off')
            .onClick(() => {
              const newShuffle = !music.getShuffle();
              music.setShuffle(newShuffle);
              shuffleBtn.setText(newShuffle ? '🔀 On' : '🔀 Off');
            })
            .withId('btn-shuffle');

          a.spacer();

          const repeatBtn = a.button(
            music.getRepeatMode() === 'none' ? '🔁 Off' :
            music.getRepeatMode() === 'one' ? '🔁 One' : '🔁 All'
          )
            .onClick(() => {
              const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
              const current = music.getRepeatMode();
              const idx = modes.indexOf(current);
              const next = modes[(idx + 1) % modes.length];
              music.setRepeatMode(next);
              repeatBtn.setText(
                next === 'none' ? '🔁 Off' :
                next === 'one' ? '🔁 One' : '🔁 All'
              );
            })
            .withId('btn-repeat');
        });

        a.separator();

        // Search
        a.hbox(() => {
          a.entry('Search...', (value) => {
            searchQuery = value;
            updatePlaylist();
          }, 250).withId('search-tracks');

          a.button('Clear').onClick(() => {
            searchQuery = '';
            updatePlaylist();
          }).withId('btn-clear-search');
        });

        // Track list
        a.label('Playlist').withId('label-playlist');
        a.scroll(() => {
          playlistContainer = a.vbox(() => {
            // Playlist will be rendered by updatePlaylist()
          }) as any;
        });
      });
    });

    win.show();

    // Initial display
    updateTrackDisplay();
    updateTimeDisplay();
    updatePlayButton();
    updatePlaylist();
  });

  // Cleanup function
  const cleanup = () => {
    unsubscribePlayback();
    unsubscribeTrack();
    unsubscribePosition();
  };

  // Return cleanup function if needed
  return cleanup as any;
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Music Player' }, (a: App) => {
    const music = new MockMusicService();
    createMusicPlayerApp(a, music);
  });
}
