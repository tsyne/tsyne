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

import { app, resolveTransport, styles, FontStyle  } from '../../core/src';
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

    // Clear and rebuild
    photoListContainer.removeAll();

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

        // Zoom slider
        a.hbox(() => {
          a.label('Zoom: ').withId('label-zoom');
          const zoomLabel = a.label('1x').withId('zoom-value');
          const settings = camera.getSettings();
          a.slider(1, 5, settings.zoom, (value) => {
            camera.updateSettings({ zoom: value });
            zoomLabel.setText(`${value.toFixed(1)}x`);
          }).withId('slider-zoom');
        });

        // Exposure slider
        a.hbox(() => {
          a.label('Exposure: ').withId('label-exposure');
          const expLabel = a.label('0').withId('exposure-value');
          const settings = camera.getSettings();
          a.slider(-2, 2, settings.exposure, (value) => {
            camera.updateSettings({ exposure: value });
            expLabel.setText(value > 0 ? `+${value.toFixed(1)}` : `${value.toFixed(1)}`);
          }).withId('slider-exposure');
        });

        // White balance selector
        a.hbox(() => {
          a.label('White Balance: ').withId('label-white-balance');
          const settings = camera.getSettings();
          const wbBtn = a.button(settings.whiteBalance)
            .onClick(() => {
              const modes: Array<'auto' | 'daylight' | 'cloudy' | 'tungsten' | 'fluorescent'> = ['auto', 'daylight', 'cloudy', 'tungsten', 'fluorescent'];
              const current = settings.whiteBalance;
              const idx = modes.indexOf(current);
              const next = modes[(idx + 1) % modes.length];
              camera.updateSettings({ whiteBalance: next });
              wbBtn.setText(next);
            })
            .withId('btn-white-balance');
        });

        // Filter selector
        a.hbox(() => {
          a.label('Filter: ').withId('label-filter');
          const settings = camera.getSettings();
          const filterBtn = a.button(settings.filter)
            .onClick(() => {
              const modes: Array<'none' | 'bw' | 'sepia' | 'cool' | 'warm'> = ['none', 'bw', 'sepia', 'cool', 'warm'];
              const current = settings.filter;
              const idx = modes.indexOf(current);
              const next = modes[(idx + 1) % modes.length];
              camera.updateSettings({ filter: next });
              filterBtn.setText(next);
            })
            .withId('btn-filter');
        });

        // Timer selector
        a.hbox(() => {
          a.label('Timer: ').withId('label-timer');
          const settings = camera.getSettings();
          const timerBtn = a.button(settings.timer === 0 ? 'Off' : `${settings.timer}s`)
            .onClick(() => {
              const modes: number[] = [0, 3, 5, 10];
              const current = settings.timer;
              const idx = modes.indexOf(current);
              const next = modes[(idx + 1) % modes.length];
              camera.updateSettings({ timer: next });
              timerBtn.setText(next === 0 ? 'Off' : `${next}s`);
            })
            .withId('btn-timer');
        });

        // Quick toggles row
        a.hbox(() => {
          const settings = camera.getSettings();

          const hdrBtn = a.button(settings.hdr ? '📊 HDR' : '📊')
            .onClick(() => {
              const newVal = !camera.getSettings().hdr;
              camera.updateSettings({ hdr: newVal });
              hdrBtn.setText(newVal ? '📊 HDR' : '📊');
            })
            .withId('btn-hdr');

          const nightBtn = a.button(settings.nightMode ? '🌙 Night' : '🌙')
            .onClick(() => {
              const newVal = !camera.getSettings().nightMode;
              camera.updateSettings({ nightMode: newVal });
              nightBtn.setText(newVal ? '🌙 Night' : '🌙');
            })
            .withId('btn-night');

          const gridBtn = a.button(settings.gridLines ? '◻ Grid' : '◻')
            .onClick(() => {
              const newVal = !camera.getSettings().gridLines;
              camera.updateSettings({ gridLines: newVal });
              gridBtn.setText(newVal ? '◻ Grid' : '◻');
            })
            .withId('btn-grid');

          const burstBtn = a.button(settings.burstMode ? '⚡ Burst' : '⚡')
            .onClick(() => {
              const newVal = !camera.getSettings().burstMode;
              camera.updateSettings({ burstMode: newVal });
              burstBtn.setText(newVal ? '⚡ Burst' : '⚡');
            })
            .withId('btn-burst');
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
  app(resolveTransport(), { title: 'Camera' }, (a: App) => {
    const cameraService = new MockCameraService();
    cameraService.initialize();
    createCameraApp(a, cameraService);
  });
}
