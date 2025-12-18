<!--
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
 -->

# Music Player App

A feature-rich music player for Tsyne on postmarketOS with playlist management, search, and advanced playback controls.

## Features

### Playback Controls
- ▶ Play / ⏸ Pause
- ⏮ Previous / Next ⏭
- Full progress seeking with time display
- Real-time position updates

### Advanced Playback
- 🔀 Shuffle mode with queue randomization
- 🔁 Repeat modes: Off → One → All
- Volume control (0-100%)
- Track duration display

### Playlist Management
- Load and display track lists
- Create custom playlists
- Add/remove tracks from playlists
- Multiple sample playlists included

### Search & Filter
- Search tracks by title, artist, album, or genre
- Real-time search results
- Clear search functionality

### User Interface
- Now Playing display with track and artist info
- Visual indicators for currently playing track
- Time display in MM:SS format
- Responsive layout

## Architecture

### Services (music-service.ts)

**IMusicService Interface** - Abstract music player operations:
```typescript
// Playback control
play() / pause() / stop()
next() / previous() / seek(seconds)

// State queries
getPlaybackState(): 'idle' | 'playing' | 'paused' | 'stopped'
getCurrentTrack(): Track | null
getCurrentPosition(): number

// Advanced features
setShuffle(enabled) / getShuffle()
setRepeatMode(mode) / getRepeatMode()
setVolume(0-100) / getVolume()

// Library operations
getTracks() / getPlaylists()
createPlaylist(name) / deletePlaylist(id)
addTrackToPlaylist() / removeTrackFromPlaylist()
search(query): Track[]

// Event listeners
onPlaybackStateChanged(callback)
onTrackChanged(callback)
onPositionChanged(callback)
```

**MockMusicService** - Complete mock implementation:
- 8 sample tracks across Synthwave and Electronic genres
- 2 pre-built playlists (Favorites, Synthwave)
- Simulated playback with real-time position updates
- Full search and playlist operations
- Event listener support

### UI (music-player.ts)

Pseudo-declarative pattern matching calculator and dialer:
- Instance-local state management
- Real-time UI updates via service listeners
- Automatic cleanup on app close
- Single `createMusicPlayerApp()` builder function

## Sample Tracks

The mock service includes 8 tracks:
- Midnight Dream (Luna Wave) - 4:05
- Electric Sunrise (Neon Sky) - 3:18
- Digital Rain (Code Echo) - 4:27
- Chrome Hearts (Pixel Soul) - 3:54
- Neon Nights (Luna Wave) - 4:49
- Cosmic Dance (Star Light) - 4:16
- Neural Waves (Synth Master) - 3:32
- Virtual Reality (Code Echo) - 4:03

## Testing

### UI Tests (TsyneTest)
```bash
npm test -- music-player.test.ts
TSYNE_HEADED=1 npm test -- music-player.test.ts  # With GUI
TAKE_SCREENSHOTS=1 npm test -- music-player.test.ts  # With screenshots
```

### Unit Tests (Jest)
```bash
npm test -- music-player.test.ts
```

Tests cover:
- Playback controls (play, pause, next, previous)
- Time management (seeking, duration)
- Volume control and clamping
- Shuffle and repeat modes
- Playlist operations
- Search functionality
- Event listeners
- UI interactions

## Usage

### Standalone
```bash
npx tsx phone-apps/music-player/music-player.ts
```

### In Phone Simulator
```bash
npx tsx phone-apps/phone-modem-simulator.ts
# Click Music Player icon to launch
```

### Desktop Integration
```typescript
import { createMusicPlayerApp } from './phone-apps/music-player/music-player';
import { MockMusicService } from './phone-apps/music-player/music-service';

app({ title: 'Music' }, (a) => {
  const music = new MockMusicService();
  createMusicPlayerApp(a, music);
});
```

## Future Enhancements

- Actual audio playback via Web Audio API or native bindings
- File browser for loading local music files
- ID3 tag reading
- Album artwork display
- Equalizer controls
- Persistent playlist storage
- Now Playing indicator in taskbar
- Background playback support
- Keyboard shortcuts (space=play/pause, arrow keys=prev/next)

## Implementation Details

### Real Audio Playback
To implement actual playback:
1. Add Web Audio API or native audio library
2. Load track files from filesystem
3. Update position in real-time from playback
4. Handle format detection (MP3, OGG, FLAC, etc.)

### Performance Optimization
- Lazy-load playlist view for large libraries
- Debounce search input
- Optimize listener callbacks
- Implement efficient queue management for shuffle

## Files

- `music-player.ts` - Main app UI
- `music-service.ts` - Music service interface and mock implementation
- `music-player.test.ts` - Comprehensive tests
- `README.md` - This file
