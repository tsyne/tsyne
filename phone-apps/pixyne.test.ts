/**
 * Pixyne Photo Manager - Jest Unit Tests
 * Tests photo management, marking, and deletion
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

interface Photo {
  id: string;
  name: string;
  path: string;
  marked: boolean;
  isSelected: boolean;
}

class PixyneTestHelper {
  private photos: Photo[] = [];
  private selectedPhotoId: string | null = null;
  private markedCount: number = 0;

  addPhoto(name: string, path: string): string {
    const id = `photo-${Date.now()}`;
    this.photos.push({
      id,
      name,
      path,
      marked: false,
      isSelected: false,
    });
    if (!this.selectedPhotoId) {
      this.selectedPhotoId = id;
    }
    return id;
  }

  markPhoto(id: string): void {
    const photo = this.photos.find((p) => p.id === id);
    if (photo) {
      photo.marked = !photo.marked;
      this.markedCount = this.photos.filter((p) => p.marked).length;
    }
  }

  deleteMarkedPhotos(): void {
    this.photos = this.photos.filter((p) => !p.marked);
    this.markedCount = 0;
    if (this.photos.length === 0) {
      this.selectedPhotoId = null;
    } else if (!this.photos.find((p) => p.id === this.selectedPhotoId)) {
      this.selectedPhotoId = this.photos[0].id;
    }
  }

  selectPhoto(id: string): void {
    if (this.photos.find((p) => p.id === id)) {
      this.selectedPhotoId = id;
    }
  }

  getPhotos(): ReadonlyArray<Photo> {
    return [...this.photos];
  }

  getPhotoCount(): number {
    return this.photos.length;
  }

  getMarkedCount(): number {
    return this.markedCount;
  }

  getSelectedPhotoId(): string | null {
    return this.selectedPhotoId;
  }

  getSelectedPhoto(): Photo | null {
    if (!this.selectedPhotoId) return null;
    return this.photos.find((p) => p.id === this.selectedPhotoId) || null;
  }

  isPhotoMarked(id: string): boolean {
    const photo = this.photos.find((p) => p.id === id);
    return photo ? photo.marked : false;
  }

  getPhotosByName(name: string): Photo[] {
    return this.photos.filter((p) => p.name === name);
  }

  getPhotosByPath(path: string): Photo[] {
    return this.photos.filter((p) => p.path === path);
  }
}

describe('Pixyne Photo Manager', () => {
  let helper: PixyneTestHelper;

  beforeEach(() => {
    helper = new PixyneTestHelper();
  });

  describe('Photo management', () => {
    test('should add a photo', () => {
      helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      expect(helper.getPhotoCount()).toBe(1);
    });

    test('should set unique IDs for photos', () => {
      const id1 = helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Wait 2ms for different timestamp
      }
      const id2 = helper.addPhoto('photo2.jpg', '/home/photo2.jpg');
      expect(id1).not.toBe(id2);
    });

    test('should auto-select first added photo', () => {
      helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      expect(helper.getSelectedPhotoId()).not.toBeNull();
    });

    test('should add multiple photos', () => {
      helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      helper.addPhoto('photo2.jpg', '/home/photo2.jpg');
      helper.addPhoto('photo3.jpg', '/home/photo3.jpg');
      expect(helper.getPhotoCount()).toBe(3);
    });
  });

  describe('Photo marking', () => {
    test('should mark a photo for deletion', () => {
      const id = helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      helper.markPhoto(id);
      expect(helper.isPhotoMarked(id)).toBe(true);
      expect(helper.getMarkedCount()).toBe(1);
    });

    test('should unmark a photo', () => {
      const id = helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      helper.markPhoto(id);
      helper.markPhoto(id);
      expect(helper.isPhotoMarked(id)).toBe(false);
      expect(helper.getMarkedCount()).toBe(0);
    });

    test('should track marked count correctly', () => {
      const id1 = helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Wait
      }
      const id2 = helper.addPhoto('photo2.jpg', '/home/photo2.jpg');
      const start2 = Date.now();
      while (Date.now() - start2 < 2) {
        // Wait
      }
      const id3 = helper.addPhoto('photo3.jpg', '/home/photo3.jpg');

      helper.markPhoto(id1);
      expect(helper.getMarkedCount()).toBe(1);

      helper.markPhoto(id2);
      expect(helper.getMarkedCount()).toBe(2);

      helper.markPhoto(id1);
      expect(helper.getMarkedCount()).toBe(1);
    });

    test('should handle marking all photos', () => {
      const id1 = helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Wait
      }
      const id2 = helper.addPhoto('photo2.jpg', '/home/photo2.jpg');

      helper.markPhoto(id1);
      helper.markPhoto(id2);
      expect(helper.getMarkedCount()).toBe(2);
      expect(helper.getPhotoCount()).toBe(2);
    });

    test('should not mark non-existent photo', () => {
      helper.markPhoto('non-existent');
      expect(helper.getMarkedCount()).toBe(0);
    });
  });

  describe('Photo deletion', () => {
    test('should delete marked photos', () => {
      const id1 = helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Wait
      }
      const id2 = helper.addPhoto('photo2.jpg', '/home/photo2.jpg');

      helper.markPhoto(id1);
      helper.deleteMarkedPhotos();

      expect(helper.getPhotoCount()).toBe(1);
      expect(helper.getMarkedCount()).toBe(0);
      expect(helper.getPhotos()[0].id).toBe(id2);
    });

    test('should clear selection on delete all marked', () => {
      const id = helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      helper.markPhoto(id);
      helper.deleteMarkedPhotos();
      expect(helper.getSelectedPhotoId()).toBeNull();
    });

    test('should update selection after partial delete', () => {
      const id1 = helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Wait
      }
      const id2 = helper.addPhoto('photo2.jpg', '/home/photo2.jpg');

      helper.selectPhoto(id1);
      helper.markPhoto(id1);
      helper.deleteMarkedPhotos();

      expect(helper.getSelectedPhotoId()).toBe(id2);
    });

    test('should not delete unmarked photos', () => {
      const id1 = helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Wait
      }
      const id2 = helper.addPhoto('photo2.jpg', '/home/photo2.jpg');

      helper.markPhoto(id1);
      helper.deleteMarkedPhotos();

      expect(helper.getPhotoCount()).toBe(1);
      expect(helper.getPhotos()[0].id).toBe(id2);
    });

    test('should handle delete with no marked photos', () => {
      helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      const countBefore = helper.getPhotoCount();
      helper.deleteMarkedPhotos();
      expect(helper.getPhotoCount()).toBe(countBefore);
    });
  });

  describe('Photo selection', () => {
    test('should select a photo', () => {
      const id1 = helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Wait
      }
      const id2 = helper.addPhoto('photo2.jpg', '/home/photo2.jpg');

      helper.selectPhoto(id1);
      expect(helper.getSelectedPhotoId()).toBe(id1);
    });

    test('should not select non-existent photo', () => {
      const id = helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      const currentId = helper.getSelectedPhotoId();
      helper.selectPhoto('non-existent');
      expect(helper.getSelectedPhotoId()).toBe(currentId);
    });

    test('should get selected photo', () => {
      const id = helper.addPhoto('test.jpg', '/home/test.jpg');
      const photo = helper.getSelectedPhoto();
      expect(photo).not.toBeNull();
      expect(photo!.name).toBe('test.jpg');
    });
  });

  describe('Photo search', () => {
    test('should find photo by name', () => {
      helper.addPhoto('vacation.jpg', '/home/vacation.jpg');
      helper.addPhoto('family.jpg', '/home/family.jpg');

      const found = helper.getPhotosByName('vacation.jpg');
      expect(found).toHaveLength(1);
      expect(found[0].name).toBe('vacation.jpg');
    });

    test('should find photos by path', () => {
      helper.addPhoto('photo1.jpg', '/home/photos/photo1.jpg');
      helper.addPhoto('photo2.jpg', '/home/photos/photo2.jpg');
      helper.addPhoto('photo3.jpg', '/archive/photo3.jpg');

      const found = helper.getPhotosByPath('/home/photos/photo1.jpg');
      expect(found).toHaveLength(1);
      expect(found[0].path).toBe('/home/photos/photo1.jpg');
    });

    test('should return empty array if no matches', () => {
      helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      const found = helper.getPhotosByName('nonexistent.jpg');
      expect(found).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty photo list', () => {
      expect(helper.getPhotoCount()).toBe(0);
      expect(helper.getSelectedPhotoId()).toBeNull();
      expect(helper.getMarkedCount()).toBe(0);
    });

    test('should handle special characters in filename', () => {
      const id = helper.addPhoto('photo [1] (2023).jpg', '/home/photo [1] (2023).jpg');
      const photo = helper.getSelectedPhoto();
      expect(photo!.name).toBe('photo [1] (2023).jpg');
    });

    test('should handle long path names', () => {
      const longPath = '/home/user/pictures/2023/vacation/beach/morning/golden_hour_photo.jpg';
      const id = helper.addPhoto('golden_hour_photo.jpg', longPath);
      const photos = helper.getPhotosByPath(longPath);
      expect(photos).toHaveLength(1);
    });

    test('should maintain photo order', () => {
      const id1 = helper.addPhoto('photo1.jpg', '/home/photo1.jpg');
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Wait
      }
      const id2 = helper.addPhoto('photo2.jpg', '/home/photo2.jpg');

      const photos = helper.getPhotos();
      expect(photos[0].id).toBe(id1);
      expect(photos[1].id).toBe(id2);
    });

    test('should handle bulk operations', () => {
      // Add many photos
      const ids = [];
      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        while (Date.now() - start < 1) {
          // Wait
        }
        ids.push(helper.addPhoto(`photo${i}.jpg`, `/home/photo${i}.jpg`));
      }

      // Mark every other photo
      for (let i = 0; i < ids.length; i += 2) {
        helper.markPhoto(ids[i]);
      }

      expect(helper.getMarkedCount()).toBe(10);
      expect(helper.getPhotoCount()).toBe(20);

      // Delete marked
      helper.deleteMarkedPhotos();
      expect(helper.getPhotoCount()).toBe(10);
      expect(helper.getMarkedCount()).toBe(0);
    });
  });
});
