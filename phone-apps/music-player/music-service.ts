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
 * Music Service
 *
 * Manages music library, playback state, and playlist operations.
 * Mock implementation provides sample music for testing.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  genre: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: Date;
}

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'stopped';
export type RepeatMode = 'none' | 'one' | 'all';

export interface IMusicService {
  // Playback control
  play(): void;
  pause(): void;
  stop(): void;
  next(): void;
  previous(): void;
  seek(position: number): void; // seconds

  // Playback state
  getPlaybackState(): PlaybackState;
  getCurrentTrack(): Track | null;
  getCurrentPosition(): number; // seconds
  getDuration(): number; // seconds

  // Volume
  setVolume(level: number): void; // 0-100
  getVolume(): number;

  // Shuffle and repeat
  setShuffle(enabled: boolean): void;
  getShuffle(): boolean;
  setRepeatMode(mode: RepeatMode): void;
  getRepeatMode(): RepeatMode;

  // Library and playlists
  getTracks(): Track[];
  getPlaylists(): Playlist[];
  createPlaylist(name: string): Playlist;
  deletePlaylist(id: string): boolean;
  addTrackToPlaylist(playlistId: string, track: Track): boolean;
  removeTrackFromPlaylist(playlistId: string, trackId: string): boolean;

  // Searching
  search(query: string): Track[];

  // Listeners
  onPlaybackStateChanged(callback: (state: PlaybackState) => void): () => void;
  onTrackChanged(callback: (track: Track | null) => void): () => void;
  onPositionChanged(callback: (position: number) => void): () => void;

  // Load a playlist or queue
  loadPlaylist(playlistId: string): void;
  loadTracks(tracks: Track[]): void;
}

/**
 * Mock Music Service for testing
 */
export class MockMusicService implements IMusicService {
  private playbackState: PlaybackState = 'stopped';
  private currentTrackIndex = 0;
  private currentPosition = 0;
  private volume = 70;
  private shuffle = false;
  private repeatMode: RepeatMode = 'none';
  private queue: Track[] = [];
  private playlists: Map<string, Playlist> = new Map();
  private tracks: Track[] = [];
  private playbackListeners: Array<(state: PlaybackState) => void> = [];
  private trackListeners: Array<(track: Track | null) => void> = [];
  private positionListeners: Array<(position: number) => void> = [];
  private positionInterval: NodeJS.Timeout | null = null;
  private nextPlaylistId = 1;

  constructor() {
    this.initializeSampleTracks();
    this.loadPlaylist('playlist-1');
  }

  private initializeSampleTracks(): void {
    this.tracks = [
      { id: 'track-1', title: 'Midnight Dream', artist: 'Luna Wave', album: 'Nocturne', duration: 245, genre: 'Synthwave' },
      { id: 'track-2', title: 'Electric Sunrise', artist: 'Neon Sky', album: 'Dawn', duration: 198, genre: 'Synthwave' },
      { id: 'track-3', title: 'Digital Rain', artist: 'Code Echo', album: 'Binary Blues', duration: 267, genre: 'Synthwave' },
      { id: 'track-4', title: 'Chrome Hearts', artist: 'Pixel Soul', album: 'Retro Future', duration: 234, genre: 'Synthwave' },
      { id: 'track-5', title: 'Neon Nights', artist: 'Luna Wave', album: 'Nocturne', duration: 289, genre: 'Synthwave' },
      { id: 'track-6', title: 'Cosmic Dance', artist: 'Star Light', album: 'Galaxy', duration: 256, genre: 'Electronic' },
      { id: 'track-7', title: 'Neural Waves', artist: 'Synth Master', album: 'Frequencies', duration: 212, genre: 'Electronic' },
      { id: 'track-8', title: 'Virtual Reality', artist: 'Code Echo', album: 'Binary Blues', duration: 243, genre: 'Synthwave' },
    ];

    // Create sample playlists
    const defaultPlaylist: Playlist = {
      id: 'playlist-1',
      name: 'Favorites',
      tracks: this.tracks.slice(0, 5),
      createdAt: new Date(),
    };
    this.playlists.set('playlist-1', defaultPlaylist);

    const synthPlaylist: Playlist = {
      id: 'playlist-2',
      name: 'Synthwave',
      tracks: this.tracks.filter(t => t.genre === 'Synthwave'),
      createdAt: new Date(),
    };
    this.playlists.set('playlist-2', synthPlaylist);
  }

  play(): void {
    if (this.queue.length === 0) return;
    this.playbackState = 'playing';
    this.startPositionUpdates();
    this.notifyPlaybackStateChanged();
  }

  pause(): void {
    this.playbackState = 'paused';
    this.stopPositionUpdates();
    this.notifyPlaybackStateChanged();
  }

  stop(): void {
    this.playbackState = 'stopped';
    this.currentPosition = 0;
    this.stopPositionUpdates();
    this.notifyPlaybackStateChanged();
    this.notifyPositionChanged();
  }

  next(): void {
    if (this.queue.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.queue.length;
    this.currentPosition = 0;
    this.notifyTrackChanged();
    this.notifyPositionChanged();
  }

  previous(): void {
    if (this.queue.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.queue.length) % this.queue.length;
    this.currentPosition = 0;
    this.notifyTrackChanged();
    this.notifyPositionChanged();
  }

  seek(position: number): void {
    const track = this.getCurrentTrack();
    if (!track) return;
    this.currentPosition = Math.min(position, track.duration);
    this.notifyPositionChanged();
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  getCurrentTrack(): Track | null {
    if (this.queue.length === 0) return null;
    return this.queue[this.currentTrackIndex] || null;
  }

  getCurrentPosition(): number {
    return this.currentPosition;
  }

  getDuration(): number {
    const track = this.getCurrentTrack();
    return track ? track.duration : 0;
  }

  setVolume(level: number): void {
    this.volume = Math.max(0, Math.min(100, level));
  }

  getVolume(): number {
    return this.volume;
  }

  setShuffle(enabled: boolean): void {
    this.shuffle = enabled;
    if (enabled && this.queue.length > 0) {
      // Shuffle the queue but keep current track
      const current = this.queue[this.currentTrackIndex];
      const remaining = this.queue.filter((_, i) => i !== this.currentTrackIndex);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      this.queue = [current, ...remaining];
      this.currentTrackIndex = 0;
    }
  }

  getShuffle(): boolean {
    return this.shuffle;
  }

  setRepeatMode(mode: RepeatMode): void {
    this.repeatMode = mode;
  }

  getRepeatMode(): RepeatMode {
    return this.repeatMode;
  }

  getTracks(): Track[] {
    return [...this.tracks];
  }

  getPlaylists(): Playlist[] {
    return Array.from(this.playlists.values());
  }

  createPlaylist(name: string): Playlist {
    const id = `playlist-${this.nextPlaylistId++}`;
    const playlist: Playlist = {
      id,
      name,
      tracks: [],
      createdAt: new Date(),
    };
    this.playlists.set(id, playlist);
    return playlist;
  }

  deletePlaylist(id: string): boolean {
    return this.playlists.delete(id);
  }

  addTrackToPlaylist(playlistId: string, track: Track): boolean {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return false;
    if (!playlist.tracks.find(t => t.id === track.id)) {
      playlist.tracks.push(track);
    }
    return true;
  }

  removeTrackFromPlaylist(playlistId: string, trackId: string): boolean {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return false;
    const idx = playlist.tracks.findIndex(t => t.id === trackId);
    if (idx >= 0) {
      playlist.tracks.splice(idx, 1);
      return true;
    }
    return false;
  }

  search(query: string): Track[] {
    const lower = query.toLowerCase();
    return this.tracks.filter(
      t =>
        t.title.toLowerCase().includes(lower) ||
        t.artist.toLowerCase().includes(lower) ||
        t.album.toLowerCase().includes(lower) ||
        t.genre.toLowerCase().includes(lower)
    );
  }

  onPlaybackStateChanged(callback: (state: PlaybackState) => void): () => void {
    this.playbackListeners.push(callback);
    return () => {
      const idx = this.playbackListeners.indexOf(callback);
      if (idx >= 0) this.playbackListeners.splice(idx, 1);
    };
  }

  onTrackChanged(callback: (track: Track | null) => void): () => void {
    this.trackListeners.push(callback);
    return () => {
      const idx = this.trackListeners.indexOf(callback);
      if (idx >= 0) this.trackListeners.splice(idx, 1);
    };
  }

  onPositionChanged(callback: (position: number) => void): () => void {
    this.positionListeners.push(callback);
    return () => {
      const idx = this.positionListeners.indexOf(callback);
      if (idx >= 0) this.positionListeners.splice(idx, 1);
    };
  }

  loadPlaylist(playlistId: string): void {
    const playlist = this.playlists.get(playlistId);
    if (playlist) {
      this.queue = [...playlist.tracks];
      this.currentTrackIndex = 0;
      this.currentPosition = 0;
      this.notifyTrackChanged();
    }
  }

  loadTracks(tracks: Track[]): void {
    this.queue = [...tracks];
    this.currentTrackIndex = 0;
    this.currentPosition = 0;
    this.notifyTrackChanged();
  }

  private startPositionUpdates(): void {
    if (this.positionInterval) return;
    this.positionInterval = setInterval(() => {
      if (this.playbackState === 'playing') {
        this.currentPosition += 1;
        const track = this.getCurrentTrack();
        if (track && this.currentPosition >= track.duration) {
          this.next();
        } else {
          this.notifyPositionChanged();
        }
      }
    }, 1000);
  }

  private stopPositionUpdates(): void {
    if (this.positionInterval) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
  }

  private notifyPlaybackStateChanged(): void {
    for (const listener of this.playbackListeners) {
      listener(this.playbackState);
    }
  }

  private notifyTrackChanged(): void {
    for (const listener of this.trackListeners) {
      listener(this.getCurrentTrack());
    }
  }

  private notifyPositionChanged(): void {
    for (const listener of this.positionListeners) {
      listener(this.currentPosition);
    }
  }

  destroy(): void {
    this.stopPositionUpdates();
  }
}
