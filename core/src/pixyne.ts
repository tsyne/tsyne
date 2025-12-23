/**
 * Pixyne App - Photo Management Application
 *
 * A simplified photo management and review application for browsing
 * and organizing photos. Allows marking photos for deletion and organizing
 * them by folder.
 *
 * Portions copyright original team and portions copyright Paul Hammant 2025
 * License: MIT
 *
 * @tsyne-app:name Pixyne
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><path d="M3 13l5-5 8 8 8-8v8" fill="none" stroke="currentColor" stroke-width="2"/></svg>
 * @tsyne-app:category Utilities
 * @tsyne-app:builder buildPixyneApp
 * @tsyne-app:args app,win
 * @tsyne-app:count single
 */

import type { App } from './app';
import type { Window } from './window';

interface Photo {
  id: string;
  name: string;
  path: string;
  marked: boolean;
  isSelected: boolean;
}

interface PixyneState {
  photos: Photo[];
  currentFolder: string;
  markedCount: number;
  selectedPhotoId: string | null;
}

/**
 * Pixyne Photo Manager UI
 */
class PixyneUI {
  private window: Window | null = null;
  private state: PixyneState = {
    photos: [],
    currentFolder: '/home/photos',
    markedCount: 0,
    selectedPhotoId: null,
  };

  constructor(private a: App) {
    this.loadPhotos();
  }

  private loadPhotos(): void {
    // Load photo list from preferences
    const photosJson = this.a.getPreference('pixyne_photos', '[]');
    const folder = this.a.getPreference('pixyne_folder', '/home/photos');
    const markedJson = this.a.getPreference('pixyne_marked', '[]');

    Promise.resolve(photosJson).then((json: string) => {
      try {
        this.state.photos = JSON.parse(json);
        if (this.state.photos.length > 0) {
          this.state.selectedPhotoId = this.state.photos[0].id;
        }
      } catch {
        this.state.photos = [];
        this.state.selectedPhotoId = null;
      }
    });

    Promise.resolve(folder).then((f: string) => {
      this.state.currentFolder = f;
    });

    Promise.resolve(markedJson).then((json: string) => {
      try {
        const markedIds = JSON.parse(json);
        this.state.markedCount = markedIds.length;
      } catch {
        this.state.markedCount = 0;
      }
    });
  }

  private savePhotos(): void {
    this.a.setPreference('pixyne_photos', JSON.stringify(this.state.photos));
    this.a.setPreference('pixyne_folder', this.state.currentFolder);

    const markedIds = this.state.photos.filter((p) => p.marked).map((p) => p.id);
    this.a.setPreference('pixyne_marked', JSON.stringify(markedIds));
  }

  private toggleMarkPhoto(id: string): void {
    const photo = this.state.photos.find((p) => p.id === id);
    if (photo) {
      photo.marked = !photo.marked;
      this.state.markedCount = this.state.photos.filter((p) => p.marked).length;
      this.savePhotos();
      this.refreshUI();
    }
  }

  private deleteMarkedPhotos(): void {
    this.state.photos = this.state.photos.filter((p) => !p.marked);
    this.state.markedCount = 0;
    if (this.state.photos.length === 0) {
      this.state.selectedPhotoId = null;
    } else if (!this.state.photos.find((p) => p.id === this.state.selectedPhotoId)) {
      this.state.selectedPhotoId = this.state.photos[0].id;
    }
    this.savePhotos();
    this.refreshUI();
  }

  private selectPhoto(id: string): void {
    if (this.state.photos.find((p) => p.id === id)) {
      this.state.selectedPhotoId = id;
      this.refreshUI();
    }
  }

  private getSelectedPhoto(): Photo | null {
    if (!this.state.selectedPhotoId) {
      return null;
    }
    return this.state.photos.find((p) => p.id === this.state.selectedPhotoId) || null;
  }

  private addSamplePhotos(): void {
    const samplePhotos = [
      { id: `photo-${Date.now()}-1`, name: 'Photo 1.jpg', path: '/home/photos/photo1.jpg', marked: false, isSelected: false },
      { id: `photo-${Date.now()}-2`, name: 'Photo 2.jpg', path: '/home/photos/photo2.jpg', marked: false, isSelected: false },
      { id: `photo-${Date.now()}-3`, name: 'Photo 3.jpg', path: '/home/photos/photo3.jpg', marked: false, isSelected: false },
      { id: `photo-${Date.now()}-4`, name: 'Photo 4.jpg', path: '/home/photos/photo4.jpg', marked: false, isSelected: false },
      { id: `photo-${Date.now()}-5`, name: 'Photo 5.jpg', path: '/home/photos/photo5.jpg', marked: false, isSelected: false },
    ];

    this.state.photos = [...samplePhotos, ...this.state.photos];
    this.state.selectedPhotoId = this.state.photos[0].id;
    this.savePhotos();
    this.refreshUI();
  }

  private refreshUI(): void {
    if (this.window) {
      this.window.setContent(() => this.buildUI(this.window!));
    }
  }

  buildUI(win: Window): void {
    this.window = win;

    const selectedPhoto = this.getSelectedPhoto();

    this.a.vbox(() => {
      // Header
      this.a.hbox(() => {
        this.a.label('Pixyne - Photo Manager').withId('pixyneTitle');
        this.a.spacer();
        this.a.label(`Marked: ${this.state.markedCount}`).withId('pixyneMarkedCount');
      });

      this.a.separator();

      // Main content area
      if (this.state.photos.length === 0) {
        this.a.vbox(() => {
          this.a.spacer();
          this.a.label('No photos loaded').withId('pixyneEmpty');
          this.a.label('Click "Load Samples" to add sample photos').withId('pixyneEmptyHint');
          this.a.spacer();
          this.a
            .button('Load Sample Photos')
            .onClick(() => this.addSamplePhotos())
            .withId('pixyneLoadBtn');
          this.a.spacer();
        });
      } else {
        this.a.hbox(() => {
          // Photo list
          this.a.vbox(() => {
            this.a.label('Photos').withId('pixyneListTitle');
            this.a.separator();

            this.a.scroll(() => {
              this.a.vbox(() => {
                for (const photo of this.state.photos) {
                  const isSelected = this.state.selectedPhotoId === photo.id;
                  this.a.hbox(() => {
                    this.a.checkbox('', (checked: boolean) => {
                      if (checked !== photo.marked) {
                        this.toggleMarkPhoto(photo.id);
                      }
                    });

                    const checkbox = this.a.checkbox('', (checked: boolean) => {
                      // No-op, just for styling
                    });

                    this.a
                      .label(photo.name)
                      .withId(`pixyne-photo-${photo.id}`);

                    if (isSelected) {
                      this.a.label('✓').withId(`pixyne-selected-${photo.id}`);
                    }

                    this.a.spacer();
                  });
                }
              });
            });
          });

          this.a.separator();

          // Photo details panel
          this.a.vbox(() => {
            if (selectedPhoto) {
              this.a.label('Photo Details').withId('pixyneDetailsTitle');
              this.a.separator();

              this.a.label(`Name: ${selectedPhoto.name}`).withId(`pixyne-name-${selectedPhoto.id}`);
              this.a.label(`Path: ${selectedPhoto.path}`).withId(`pixyne-path-${selectedPhoto.id}`);

              this.a.separator();

              this.a.hbox(() => {
                this.a
                  .checkbox(selectedPhoto.marked ? 'Marked for deletion' : 'Mark for deletion', (checked: boolean) => {
                    this.toggleMarkPhoto(selectedPhoto.id);
                  })
                  .withId(`pixyne-mark-${selectedPhoto.id}`);
              });

              this.a.separator();

              this.a.hbox(() => {
                if (this.state.markedCount > 0) {
                  this.a
                    .button(`Delete ${this.state.markedCount} Marked`)
                    .onClick(() => this.deleteMarkedPhotos())
                    .withId('pixyneDeleteBtn');
                }

                this.a.spacer();
              });
            } else {
              this.a.spacer();
              this.a.label('Select a photo to view details').withId('pixyneNoSelection');
              this.a.spacer();
            }
          });
        });
      }
    });
  }

  // Public methods for testing
  getPhotos(): ReadonlyArray<Photo> {
    return [...this.state.photos];
  }

  getMarkedCount(): number {
    return this.state.markedCount;
  }

  getSelectedPhotoId(): string | null {
    return this.state.selectedPhotoId;
  }

  cleanup(): void {
    // Cleanup if needed
  }
}

/**
 * Create the Pixyne app
 */
export function buildPixyneApp(a: App, win: Window): PixyneUI {
  const ui = new PixyneUI(a);

  win.setContent(() => {
    ui.buildUI(win);
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport  } = require('./index');
  app(resolveTransport(), { title: 'Pixyne', width: 900, height: 700 }, (a: App) => {
    a.window({ title: 'Pixyne - Photo Manager', width: 900, height: 700 }, (win: Window) => {
      buildPixyneApp(a, win);
    });
  });
}
