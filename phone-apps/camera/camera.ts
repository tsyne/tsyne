/**
 * Camera App
 *
 * A camera application for taking and managing still photos.
 * Implements pseudo-declarative pattern following calculator.ts style.
 *
 * @tsyne-app:name Camera
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
 * @tsyne-app:category media
 * @tsyne-app:builder createCameraApp
 * @tsyne-app:args app,camera
 * @tsyne-app:count single
 */

import { app, styles, FontStyle } from '../../core/src';
import type { App } from '../../core/src';
import type { Window } from '../../core/src';
import type { Label } from '../../core/src';
import type { VBox } from '../../core/src';
import { ICameraService, MockCameraService, Photo } from './camera-service';

// Define camera styles
styles({
  'camera-title': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 22,
  },
  'camera-info': {
    text_align: 'center',
    font_size: 14,
  },
  'photo-count': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 16,
  },
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Build the camera UI - Pseudo-declarative style
 */
export function createCameraApp(a: App, camera: ICameraService): void {
  // Instance-local state
  let photoCountLabel: Label | undefined;
  let photoListContainer: VBox | undefined;
  let statusLabel: Label | undefined;
  let isCapturing = false;

  // Subscribe to camera service events
  const unsubscribeCapture = camera.onPhotoCaptured(() => {
    updatePhotoList();
    updateStats();
  });
  const unsubscribeDelete = camera.onPhotoDeleted(() => {
    updatePhotoList();
    updateStats();
  });

  function updateStats() {
    const count = camera.getPhotoCount();
    const total = camera.getTotalSize();
    if (photoCountLabel) {
      photoCountLabel.setText(`${count} photos • ${formatBytes(total)}`);
    }
  }

  function updatePhotoList() {
    if (!photoListContainer) return;

    // Simplified: clear and rebuild
    photoListContainer.destroyChildren?.();

    const photos = camera.getPhotos();

    if (photos.length === 0) {
      a.label('No photos yet. Tap capture to take a photo.').withId('label-no-photos');
    } else {
      const favorites = photos.filter(p => p.isFavorite);

      if (favorites.length > 0) {
        a.label('Favorites').withId('label-favorites');
        favorites.forEach((photo, index) => {
          renderPhotoRow(photo, `fav-${index}`);
        });
        a.separator();
      }

      a.label('All Photos').withId('label-all-photos');
      photos.forEach((photo, index) => {
        renderPhotoRow(photo, `photo-${index}`);
      });
    }
  }

  function renderPhotoRow(photo: Photo, idPrefix: string) {
    a.hbox(() => {
      // Photo info
      a.vbox(() => {
        a.label(photo.filename).withId(`${idPrefix}-name`);
        a.label(`${photo.width}x${photo.height} • ${formatBytes(photo.size)}`).withId(`${idPrefix}-info`);
        a.label(formatDate(photo.timestamp)).withId(`${idPrefix}-date`);
      });

      a.spacer();

      // Favorite button
      a.button(photo.isFavorite ? '★' : '☆').onClick(() => {
        camera.toggleFavorite(photo.id);
        updatePhotoList();
      }).withId(`${idPrefix}-fav`);

      // Delete button
      a.button('✕').onClick(() => {
        camera.deletePhoto(photo.id);
      }).withId(`${idPrefix}-delete`);
    });
  }

  a.window({ title: 'Camera', width: 420, height: 700 }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.label('📷 Camera').withId('camera-title');

        a.separator();

        // Camera preview placeholder
        a.padded(() => {
          a.label('📸 Camera Preview').withId('preview-placeholder');
          a.label('(Tap Capture to take a photo)').withId('preview-hint');
        });

        a.separator();

        // Capture button (large)
        a.button('● CAPTURE')
          .onClick(async () => {
            if (isCapturing) return;
            isCapturing = true;
            if (statusLabel) statusLabel.setText('Capturing...');

            const photo = await camera.capture();
            if (photo) {
              if (statusLabel) statusLabel.setText(`Photo saved: ${photo.filename}`);
            } else {
              if (statusLabel) statusLabel.setText('Capture failed');
            }

            isCapturing = false;
            setTimeout(() => {
              if (statusLabel) statusLabel.setText('Ready');
            }, 2000);
          })
          .withId('btn-capture');

        // Status
        statusLabel = a.label('Ready').withId('camera-status');

        a.separator();

        // Settings
        a.hbox(() => {
          a.label('Resolution: ').withId('label-resolution');
          const settings = camera.getSettings();
          const resBtn = a.button(settings.resolution.charAt(0).toUpperCase() + settings.resolution.slice(1))
            .onClick(() => {
              const resolutions: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
              const current = settings.resolution;
              const idx = resolutions.indexOf(current);
              const next = resolutions[(idx + 1) % resolutions.length];
              camera.updateSettings({ resolution: next });
              resBtn.setText(next.charAt(0).toUpperCase() + next.slice(1));
            })
            .withId('btn-resolution');
        });

        a.hbox(() => {
          a.label('Flash: ').withId('label-flash');
          const settings = camera.getSettings();
          const flashBtn = a.button(settings.flash.charAt(0).toUpperCase() + settings.flash.slice(1))
            .onClick(() => {
              const modes: Array<'off' | 'on' | 'auto'> = ['off', 'on', 'auto'];
              const current = settings.flash;
              const idx = modes.indexOf(current);
              const next = modes[(idx + 1) % modes.length];
              camera.updateSettings({ flash: next });
              flashBtn.setText(next.charAt(0).toUpperCase() + next.slice(1));
            })
            .withId('btn-flash');
        });

        a.separator();

        // Photo library header
        photoCountLabel = a.label('0 photos').withId('photo-count-display');

        a.hbox(() => {
          a.button('Clear All')
            .onClick(() => {
              camera.deleteAllPhotos();
              updatePhotoList();
              updateStats();
            })
            .withId('btn-clear-all');

          a.spacer();

          a.button('Refresh')
            .onClick(() => {
              updatePhotoList();
              updateStats();
            })
            .withId('btn-refresh');
        });

        a.separator();

        // Photo gallery
        a.scroll(() => {
          photoListContainer = a.vbox(() => {
            // Photos will be rendered by updatePhotoList()
          }) as any;
        });
      });
    });

    win.show();

    // Initial display
    updatePhotoList();
    updateStats();
  });

  // Cleanup function
  const cleanup = () => {
    unsubscribeCapture();
    unsubscribeDelete();
  };

  return cleanup as any;
}

// Standalone execution
if (require.main === module) {
  app({ title: 'Camera' }, (a: App) => {
    const cameraService = new MockCameraService();
    cameraService.initialize();
    createCameraApp(a, cameraService);
  });
}
