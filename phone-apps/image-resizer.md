# Image Resizer App

Batch or single image resizing application with customizable dimensions and aspect ratio preservation.

## Features

- **Single and batch resizing** - Process one or multiple images at once
- **Customizable dimensions** - Set target width and height
- **Aspect ratio preservation** - Optionally maintain original aspect ratio
- **Quality control** - Adjust output quality (0-100%)
- **Multiple formats** - Support for JPEG, PNG, GIF, BMP, WebP, TIFF
- **Job tracking** - Monitor status of resize operations
- **Persistent settings** - Remember your preferred dimensions

## Supported Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- BMP (.bmp)
- WebP (.webp)
- TIFF (.tiff, .tif)

## How to Use

### Adding Images
1. Click "Add Image" to select one or more image files
2. Images are validated and added to the job queue

### Configuring Resize Settings
1. **Width** - Set target width in pixels (1-8000)
2. **Height** - Set target height in pixels (1-8000)
3. **Quality** - Set output quality from 0-100%
4. **Maintain Aspect Ratio** - Check to preserve original proportions

### Processing Images
1. Configure your desired resize settings
2. Add images to the queue
3. Click "Process All" to start resizing
4. Monitor progress in the status area

### Job Status
- **Pending** - Waiting to be processed
- **Processing** - Currently being resized
- **Completed** - Successfully resized
- **Error** - Failed to process

## Architecture

The Image Resizer app uses Tsyne's declarative MVC pattern:

- **Model**: `ResizeJob` array with `ResizeSettings` configuration
- **View**: Input fields for dimensions, quality, buttons for actions, status display
- **Controller**: Button handlers manage image selection and batch processing

### File Validation
- Validates file extensions against supported formats
- Case-insensitive extension checking
- Rejects unsupported file types

### Dimension Calculation
- When aspect ratio is maintained, calculates new dimensions proportionally
- Scales image to fit within specified dimensions while preserving ratio
- Direct dimension setting when aspect ratio is not maintained

### Batch Processing
- Processes multiple images sequentially
- Tracks individual job status
- Provides real-time status updates

## Code Example

```typescript
import { buildImageResizerApp } from './image-resizer';
import { app } from './src';

app({ title: 'Image Resizer' }, (a) => {
  a.window({ title: 'Image Resizer', width: 900, height: 700 }, (win) => {
    buildImageResizerApp(a, win);
  });
});
```

## Testing

### Jest Tests
Unit tests for image validation, dimension calculation, and job management:
```bash
cd phone-apps
npm test -- image-resizer.test.ts
```

Coverage includes:
- File extension validation
- Filename extraction
- Dimension calculations with and without aspect ratio
- Settings storage and validation
- Job creation and status tracking
- Format support checking

### TsyneTest Tests
UI interaction tests:
```bash
cd core
npm test -- image-resizer-tsyne
```

Coverage includes:
- Initial UI rendering with title
- Control buttons functionality
- Resize settings inputs display
- Status information display
- All required UI sections

## Settings Storage

Settings are saved and loaded automatically:
- `resizer_width` - Target width in pixels
- `resizer_height` - Target height in pixels
- `resizer_quality` - Output quality percentage

## Performance Considerations

- **Large images** - Processing time depends on original image size
- **Batch operations** - Large batches process sequentially
- **Memory usage** - Consider available RAM when processing very large images
- **Output quality** - Higher quality settings produce larger files

## Limitations

- Currently simulates image processing without actual resizing
- Future versions will integrate with image libraries for actual resizing
- Format conversion requires explicit format selection

## Files

- `image-resizer.ts` - Main implementation (phone-apps and core/src)
- `image-resizer.test.ts` - Jest unit tests (phone-apps)
- `image-resizer-tsyne.test.ts` - Tsyne UI tests (phone-apps and core/src)

## License

MIT License

Portions copyright original team and portions copyright Paul Hammant 2025

This is a port of the Image Resizer application (https://github.com/tiagomelo/image-resizer) to Tsyne.
