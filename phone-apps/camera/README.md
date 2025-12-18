# Camera App

A camera application for Tsyne on postmarketOS with still photo capture, gallery management, and camera settings control.

## Features

### Photo Capture
- ● CAPTURE button for taking photos
- Simulated capture with configurable delay
- Automatic photo storage with timestamps
- Status feedback during capture

### Camera Settings
- **Resolution**: Low (640x480), Medium (1280x720), High (1920x1080)
- **Flash**: Off, On, Auto
- **Quality**: 0-100% (affects file size)
- **Timer**: 0, 3, 5, 10 seconds (infrastructure in place)
- **Grid Lines**: Toggle grid overlay (infrastructure in place)

### Photo Gallery
- View all captured photos sorted by timestamp
- Favorites section with starred photos
- Thumbnail with filename, dimensions, and size
- Timestamp display for each photo
- Toggle favorite status (★/☆)
- Delete individual photos
- Clear all photos at once

### Photo Management
- Favorite marking for quick access
- Photo metadata: resolution, size, timestamp
- File size display (B, KB, MB, GB)
- Refresh gallery button
- Total storage calculation
- Photo count display

## Architecture

### Services (camera-service.ts)

**ICameraService Interface** - Abstract camera operations:
```typescript
// Camera control
initialize(): Promise<boolean>
isAvailable(): boolean
capture(): Promise<Photo | null>
setMode(mode: 'photo' | 'video')
getMode()

// Camera settings
getSettings(): CameraSettings
updateSettings(settings: Partial<CameraSettings>)
getResolution(res: 'low' | 'medium' | 'high'): [number, number]

// Photo library
getPhotos(): Photo[]
getPhoto(id: string): Photo | null
deletePhoto(id: string): boolean
toggleFavorite(id: string): boolean
getFavorites(): Photo[]

// Operations
sharePhoto(id: string): Promise<string>
deleteAllPhotos(): boolean

// Statistics
getPhotoCount(): number
getTotalSize(): number

// Event listeners
onPhotoCaptured(callback)
onPhotoDeleted(callback)
```

**MockCameraService** - Complete mock implementation:
- 3 sample photos with realistic metadata
- Simulated photo capture with configurable resolution and quality
- Quality-aware file size calculation
- Resolution presets (low, medium, high)
- Settings management
- Event listener support
- Sorting by timestamp

### UI (camera.ts)

Pseudo-declarative pattern matching all other apps:
- Instance-local state management
- Real-time UI updates via service listeners
- Automatic event listener cleanup
- Single `createCameraApp()` builder function
- Settings toggles with cycling through options
- Dynamic gallery rendering

## Sample Photos

The mock service includes 3 sample photos:
- **photo_20240115_143022.jpg** (1920x1080, 512KB) - Today (marked favorite)
- **photo_20240114_102145.jpg** (1920x1080, 640KB) - Yesterday
- **photo_20240113_180530.jpg** (1920x1080, 480KB) - 3 days ago (marked favorite)

## Testing

### UI Tests (TsyneTest)
```bash
npm test -- camera.test.ts
TSYNE_HEADED=1 npm test -- camera.test.ts  # With GUI
TAKE_SCREENSHOTS=1 npm test -- camera.test.ts  # With screenshots
```

### Unit Tests (Jest)
```bash
npm test -- camera.test.ts
```

Tests cover:
- Camera initialization
- Photo capture
- Settings management
- Resolution configuration
- Photo CRUD operations (create, read, update, delete)
- Favorite toggling
- Gallery management
- Photo sharing
- Event listeners
- Statistics calculations
- Quality and resolution effects
- Screenshot capability support

## Usage

### Standalone
```bash
npx tsx phone-apps/camera/camera.ts
```

### In Phone Simulator
```bash
npx tsx phone-apps/phone-modem-simulator.ts
# Click Camera icon to launch
```

### Desktop Integration
```typescript
import { createCameraApp } from './phone-apps/camera/camera';
import { MockCameraService } from './phone-apps/camera/camera-service';

app({ title: 'Camera' }, async (a) => {
  const camera = new MockCameraService();
  await camera.initialize();
  createCameraApp(a, camera);
});
```

## Resolution Presets

| Name   | Dimensions | Aspect Ratio | Use Case |
|--------|-----------|--------------|----------|
| Low    | 640x480   | 4:3          | Thumbnails, quick uploads |
| Medium | 1280x720  | 16:9         | Social media, web |
| High   | 1920x1080 | 16:9         | Full quality, printing |

## Quality Settings

- **50%** - Small files, lower quality (~50KB for high res)
- **85%** (default) - Balanced (medium files) (~512KB for high res)
- **100%** - Maximum quality, larger files (~800KB+ for high res)

## Flash Modes

- **Off** - Never use flash
- **On** - Always use flash
- **Auto** - Use flash when needed (based on lighting)

## File Size Calculation

File size estimates:
```
Size = (Width × Height × 3 × Quality) / 100
For 1920x1080 at 85% quality ≈ 512KB
For 1280x720 at 85% quality ≈ 228KB
For 640x480 at 85% quality ≈ 57KB
```

## Photo Metadata

Each photo includes:
- `id` - Unique identifier
- `filename` - Generated filename with timestamp
- `path` - File system path
- `timestamp` - Capture time
- `width` / `height` - Resolution
- `size` - File size in bytes
- `isFavorite` - Star/favorite status
- `thumbnailData` - Optional base64 preview (infrastructure for future)

## Future Enhancements

- Real camera hardware access via Web API or native bindings
- Video recording (infrastructure in place)
- Camera preview/viewfinder display
- Effects and filters
- Image editing capabilities
- Burst mode (rapid photo capture)
- HDR (High Dynamic Range) mode
- Night mode/low-light enhancement
- QR code scanning
- Panorama mode
- Face detection and beauty filters
- Geolocation tagging
- Photo collage creation
- Gallery organization by date, location, tags
- Backup to cloud storage
- Photo search and discovery
- Slideshow viewing
- Batch operations (move, delete, export)
- Color corrections and adjustments
- Red-eye removal
- Crop and rotate tools
- Print dialog integration
- Share to social media
- Video thumbnail generation
- RAW photo support

## Implementation Details

### Real Photo Capture
To implement actual camera:
1. Request camera hardware permission
2. Use Web API (`getUserMedia` for preview)
3. Capture frames to canvas
4. Encode to JPEG/PNG
5. Store to device filesystem
6. Update UI in real-time

### Performance Optimization
- Lazy-load gallery thumbnails
- Cache photo metadata
- Compress high-res preview thumbnails
- Batch event listener updates
- Efficient storage calculations

## Files

- `camera.ts` - Main app UI
- `camera-service.ts` - Camera service interface and mock implementation
- `camera.test.ts` - Comprehensive tests (21 tests)
- `README.md` - This file
