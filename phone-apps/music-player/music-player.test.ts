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
 * Tests for Music Player App
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createMusicPlayerApp } from './music-player';
import { MockMusicService } from './music-service';

describe('Music Player App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let music: MockMusicService;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    music = new MockMusicService();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
    music.destroy();
  });

  test('should display music player title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMusicPlayerApp(app, music);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('player-title').within(500).shouldExist();
  });

  test('should display now playing track info', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMusicPlayerApp(app, music);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show first track from default playlist
    await ctx.getByID('now-playing-title').within(500).shouldExist();
    await ctx.getByID('now-playing-artist').within(500).shouldExist();
  });

  test('should display playback controls', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMusicPlayerApp(app, music);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Control buttons should be visible
    await ctx.getByID('btn-previous').within(500).shouldExist();
    await ctx.getByID('btn-play').within(500).shouldExist();
    await ctx.getByID('btn-next').within(500).shouldExist();
  });

  test('should start playing when play button clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMusicPlayerApp(app, music);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state should be stopped
    expect(music.getPlaybackState()).toBe('stopped');

    // Click play button
    await ctx.getByID('btn-play').click();

    // Should be playing
    expect(music.getPlaybackState()).toBe('playing');
  });

  test('should pause when pause button clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMusicPlayerApp(app, music);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Play
    await ctx.getByID('btn-play').click();
    expect(music.getPlaybackState()).toBe('playing');

    // Pause
    await ctx.getByID('btn-play').click();
    expect(music.getPlaybackState()).toBe('paused');
  });

  test('should display time information', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMusicPlayerApp(app, music);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Time display should show format "0:00 / 4:05" (or similar)
    const timeText = await ctx.getByID('player-time').getText();
    expect(timeText).toMatch(/^\d+:\d{2} \/ \d+:\d{2}$/);
  });

  test('should display volume control', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMusicPlayerApp(app, music);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Volume display and slider should exist
    await ctx.getByID('label-volume').within(500).shouldExist();
    await ctx.getByID('volume-display').within(500).shouldExist();
    await ctx.getByID('volume-slider').within(500).shouldExist();
  });

  test('should have shuffle button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMusicPlayerApp(app, music);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-shuffle').within(500).shouldExist();
  });

  test('should have repeat button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMusicPlayerApp(app, music);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-repeat').within(500).shouldExist();
  });

  test('should have search functionality', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMusicPlayerApp(app, music);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Search input should exist
    await ctx.getByID('search-tracks').within(500).shouldExist();
    await ctx.getByID('btn-clear-search').within(500).shouldExist();
  });

  test('should display playlist', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMusicPlayerApp(app, music);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Playlist label should exist
    await ctx.getByID('label-playlist').within(500).shouldExist();
  });

  test('should take screenshot for documentation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createMusicPlayerApp(app, music);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start playing to show active state
    await ctx.getByID('btn-play').click();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshot = await ctx.screenshot();
      console.log(`Music Player screenshot saved: ${screenshot}`);
    }
  });
});

/**
 * Unit tests for MockMusicService
 */
describe('MockMusicService', () => {
  let service: MockMusicService;

  beforeEach(() => {
    service = new MockMusicService();
  });

  afterEach(() => {
    service.destroy();
  });

  test('should have initial state of stopped', () => {
    expect(service.getPlaybackState()).toBe('stopped');
  });

  test('should start playing when play() called', () => {
    service.play();
    expect(service.getPlaybackState()).toBe('playing');
  });

  test('should pause when pause() called', () => {
    service.play();
    service.pause();
    expect(service.getPlaybackState()).toBe('paused');
  });

  test('should return to stopped when stop() called', () => {
    service.play();
    service.stop();
    expect(service.getPlaybackState()).toBe('stopped');
    expect(service.getCurrentPosition()).toBe(0);
  });

  test('should have current track', () => {
    const track = service.getCurrentTrack();
    expect(track).toBeDefined();
    expect(track?.title).toBeTruthy();
  });

  test('should advance to next track', () => {
    const firstTrack = service.getCurrentTrack();
    service.next();
    const secondTrack = service.getCurrentTrack();
    expect(firstTrack?.id).not.toBe(secondTrack?.id);
  });

  test('should return to previous track', () => {
    const firstTrack = service.getCurrentTrack();
    service.next();
    service.previous();
    const currentTrack = service.getCurrentTrack();
    expect(firstTrack?.id).toBe(currentTrack?.id);
  });

  test('should seek to position', () => {
    service.seek(100);
    expect(service.getCurrentPosition()).toBe(100);
  });

  test('should respect duration limits on seek', () => {
    const track = service.getCurrentTrack();
    const duration = track?.duration || 0;
    service.seek(duration + 100);
    expect(service.getCurrentPosition()).toBeLessThanOrEqual(duration);
  });

  test('should control volume', () => {
    service.setVolume(50);
    expect(service.getVolume()).toBe(50);
  });

  test('should clamp volume between 0-100', () => {
    service.setVolume(-50);
    expect(service.getVolume()).toBe(0);
    service.setVolume(150);
    expect(service.getVolume()).toBe(100);
  });

  test('should toggle shuffle', () => {
    expect(service.getShuffle()).toBe(false);
    service.setShuffle(true);
    expect(service.getShuffle()).toBe(true);
  });

  test('should set repeat mode', () => {
    service.setRepeatMode('one');
    expect(service.getRepeatMode()).toBe('one');
    service.setRepeatMode('all');
    expect(service.getRepeatMode()).toBe('all');
    service.setRepeatMode('none');
    expect(service.getRepeatMode()).toBe('none');
  });

  test('should return all tracks', () => {
    const tracks = service.getTracks();
    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks.length).toBeGreaterThan(0);
  });

  test('should return playlists', () => {
    const playlists = service.getPlaylists();
    expect(Array.isArray(playlists)).toBe(true);
    expect(playlists.length).toBeGreaterThan(0);
  });

  test('should create new playlist', () => {
    const playlist = service.createPlaylist('Test Playlist');
    expect(playlist.name).toBe('Test Playlist');
    expect(playlist.tracks.length).toBe(0);
    expect(service.getPlaylists().find(p => p.id === playlist.id)).toBeDefined();
  });

  test('should delete playlist', () => {
    const playlist = service.createPlaylist('To Delete');
    const before = service.getPlaylists().length;
    const result = service.deletePlaylist(playlist.id);
    const after = service.getPlaylists().length;
    expect(result).toBe(true);
    expect(after).toBe(before - 1);
  });

  test('should add track to playlist', () => {
    const playlist = service.createPlaylist('My Playlist');
    const track = service.getTracks()[0];
    const result = service.addTrackToPlaylist(playlist.id, track);
    expect(result).toBe(true);
    expect(service.getPlaylists().find(p => p.id === playlist.id)?.tracks.length).toBe(1);
  });

  test('should search tracks', () => {
    const results = service.search('midnight');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title.toLowerCase()).toContain('midnight');
  });

  test('should search by artist', () => {
    const results = service.search('Luna Wave');
    expect(results.length).toBeGreaterThan(0);
  });

  test('should notify listeners on playback state change', async () => {
    const stateChanges: string[] = [];
    service.onPlaybackStateChanged((state) => stateChanges.push(state));

    service.play();
    expect(stateChanges).toContain('playing');

    service.pause();
    expect(stateChanges).toContain('paused');

    service.stop();
    expect(stateChanges).toContain('stopped');
  });
});
