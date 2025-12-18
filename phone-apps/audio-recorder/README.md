# Audio Recorder App

A full-featured audio recording and playback application for Tsyne on postmarketOS with quality control and recording management.

## Features

### Recording Controls
- ● Record button to start/stop recordings
- ⏸ Pause/Resume during recording
- Large time display (MM:SS or HH:MM:SS format)
- Real-time duration tracking

### Playback
- Play/pause recordings from library
- Automatic playback duration tracking
- Seek support (mock)
- Multiple recording format support (WAV, OGG, MP3)

### Recording Management
- Library of all recordings with metadata
- Delete recordings
- Rename recordings
- Sorting by creation date (newest first)
- Display duration and file size for each recording

### Quality Settings
- Low quality (8KB/s, 8000 Hz)
- Medium quality (32KB/s, 16000 Hz)
- High quality (88KB/s, 44100 Hz)
- Configurable sample rate

### Metadata
- Recording name
- Duration in seconds
- File size (approximate)
- Sample rate (8000, 16000, 44100 Hz)
- Channel count (mono: 1 channel)
- Format (WAV, OGG, MP3)
- Creation timestamp

## Architecture

### Services (recording-service.ts)

**IRecordingService Interface** - Abstract recording operations:
```typescript
// Recording control
startRecording(name: string): Promise<boolean>
stopRecording(): Promise<Recording | null>
pauseRecording(): Promise<void>
resumeRecording(): Promise<void>

// Playback control
playRecording(id: string): Promise<boolean>
stopPlayback(): Promise<void>
pausePlayback(): Promise<void>
resumePlayback(): Promise<void>

// State queries
getRecordingState(): 'idle' | 'recording' | 'paused'
isPlaying(): boolean
getCurrentRecordingDuration(): number
getPlaybackPosition(): number

// Quality and settings
setQuality(quality: 'low' | 'medium' | 'high')
getQuality()
setSampleRate(rate: number)
getSampleRate()

// Library operations
getRecordings(): Recording[]
getRecording(id: string): Recording | null
deleteRecording(id: string): boolean
renameRecording(id: string, newName: string): boolean

// Event listeners
onRecordingStateChanged(callback)
onRecordingDurationChanged(callback)
onPlaybackPositionChanged(callback)

// Export/Import
exportRecording(id: string, format: 'wav' | 'ogg' | 'mp3'): Promise<string>
```

**MockRecordingService** - Complete mock implementation:
- 3 sample recordings with different lengths
- Recording state tracking with event notifications
- Real-time playback simulation
- Duration and position tracking
- Quality and sample rate configuration
- Full export capability (returns mock paths)

### UI (audio-recorder.ts)

Pseudo-declarative pattern matching calculator, dialer, and music player:
- Instance-local state management
- Real-time UI updates via service listeners
- Automatic event listener cleanup
- Single `createAudioRecorderApp()` builder function
- Large time display for readability
- Status indicator (Ready, Recording..., Paused)

## Sample Recordings

The mock service includes 3 sample recordings:
- **Meeting Notes** (5m 42s, 512KB) - WAV format
- **Voice Memo** (2m 5s, 192KB) - OGG format
- **Phone Interview** (14m 36s, 1.3MB) - MP3 format

## Testing

### UI Tests (TsyneTest)
```bash
npm test -- audio-recorder.test.ts
TSYNE_HEADED=1 npm test -- audio-recorder.test.ts  # With GUI
TAKE_SCREENSHOTS=1 npm test -- audio-recorder.test.ts  # With screenshots
```

### Unit Tests (Jest)
```bash
npm test -- audio-recorder.test.ts
```

Tests cover:
- Recording start/stop/pause/resume
- Duration tracking
- Playback controls
- Recording management (delete, rename)
- Quality and sample rate settings
- Event listener notifications
- UI interactions
- State transitions

## Usage

### Standalone
```bash
npx tsx phone-apps/audio-recorder/audio-recorder.ts
```

### In Phone Simulator
```bash
npx tsx phone-apps/phone-modem-simulator.ts
# Click Audio Recorder icon to launch
```

### Desktop Integration
```typescript
import { createAudioRecorderApp } from './phone-apps/audio-recorder/audio-recorder';
import { MockRecordingService } from './phone-apps/audio-recorder/recording-service';

app({ title: 'Audio Recorder' }, (a) => {
  const recording = new MockRecordingService();
  createAudioRecorderApp(a, recording);
});
```

## Time Format

- Under 1 hour: `MM:SS` (e.g., `5:42`)
- 1 hour or more: `HH:MM:SS` (e.g., `1:05:42`)

## Quality Presets

| Quality | Sample Rate | Bit Rate | Use Case |
|---------|-------------|----------|----------|
| Low     | 8000 Hz     | 8 KB/s   | Voice notes, dictation |
| Medium  | 16000 Hz    | 32 KB/s  | Phone calls, meetings |
| High    | 44100 Hz    | 88 KB/s  | Music, high-quality recordings |

## Recording State Machine

```
idle
  ├──startRecording()──> recording

recording
  ├──pauseRecording()──> paused
  └──stopRecording()───> idle (saves recording)

paused
  ├──resumeRecording()──> recording
  └──stopRecording()────> idle (saves recording)
```

## Future Enhancements

- Real audio capture using Web Audio API or native bindings
- Actual file storage on filesystem
- Waveform visualization during recording
- Audio levels meter
- Playback speed control
- Trimming/editing capabilities
- Audio filters (noise reduction, compression)
- Recording sharing (export/import)
- Continuous background recording
- Voice activation recording
- Automatic naming (timestamp + location)
- Backup to cloud storage
- Search by transcription (requires speech-to-text)

## Implementation Details

### Real Audio Capture
To implement actual recording:
1. Request microphone permission
2. Use Web Audio API (`getUserMedia`, `MediaRecorder`)
3. Capture audio streams and encode to formats
4. Store files to app directory
5. Update durations and sizes in real-time

### Performance Optimization
- Lazy-load recording list for large libraries
- Stream recording to disk to avoid memory issues
- Efficient event listener management
- Debounce UI updates during playback

## Files

- `audio-recorder.ts` - Main app UI
- `recording-service.ts` - Recording service interface and mock implementation
- `audio-recorder.test.ts` - Comprehensive tests
- `README.md` - This file
