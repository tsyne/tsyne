/**
 * Tests for Camera App
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createCameraApp } from './camera';
import { MockCameraService } from './camera-service';

describe('Camera App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let camera: MockCameraService;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    camera = new MockCameraService();
    await camera.initialize();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display camera title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCameraApp(app, camera);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('camera-title').within(500).shouldExist();
  });

  test('should display preview area', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCameraApp(app, camera);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('preview-placeholder').within(500).shouldExist();
  });

  test('should have capture button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCameraApp(app, camera);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-capture').within(500).shouldExist();
  });

  test('should display camera status', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCameraApp(app, camera);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('camera-status').within(500).shouldBe('Ready');
  });

  test('should have resolution selector', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCameraApp(app, camera);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-resolution').within(500).shouldExist();
  });

  test('should have flash selector', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCameraApp(app, camera);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-flash').within(500).shouldExist();
  });

  test('should display photo count', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCameraApp(app, camera);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show photo count
    await ctx.getByID('photo-count-display').within(500).shouldExist();
  });

  test('should have clear all button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCameraApp(app, camera);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-clear-all').within(500).shouldExist();
  });

  test('should have refresh button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCameraApp(app, camera);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-refresh').within(500).shouldExist();
  });

  test('should display sample photos', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCameraApp(app, camera);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Sample photos should be visible
    expect(camera.getPhotoCount()).toBeGreaterThan(0);
  });

  test('should take screenshot for documentation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCameraApp(app, camera);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshot = await ctx.screenshot();
      console.log(`Camera screenshot saved: ${screenshot}`);
    }
  });
});

/**
 * Unit tests for MockCameraService
 */
describe('MockCameraService', () => {
  let service: MockCameraService;

  beforeEach(async () => {
    service = new MockCameraService();
    await service.initialize();
  });

  test('should initialize successfully', async () => {
    const result = await service.initialize();
    expect(result).toBe(true);
  });

  test('should be available after initialization', () => {
    expect(service.isAvailable()).toBe(true);
  });

  test('should have initial photos', () => {
    const photos = service.getPhotos();
    expect(photos.length).toBeGreaterThan(0);
  });

  test('should capture photo', async () => {
    const before = service.getPhotoCount();
    const photo = await service.capture();

    const after = service.getPhotoCount();
    expect(after).toBe(before + 1);
    expect(photo).toBeDefined();
    expect(photo?.id).toBeTruthy();
  });

  test('should return captured photo with correct properties', async () => {
    const photo = await service.capture();

    expect(photo?.filename).toBeTruthy();
    expect(photo?.path).toBeTruthy();
    expect(photo?.width).toBeGreaterThan(0);
    expect(photo?.height).toBeGreaterThan(0);
    expect(photo?.size).toBeGreaterThan(0);
    expect(photo?.isFavorite).toBe(false);
  });

  test('should set camera mode', () => {
    service.setMode('photo');
    expect(service.getMode()).toBe('photo');
  });

  test('should get and update settings', () => {
    const original = service.getSettings();
    service.updateSettings({ resolution: 'low' });
    const updated = service.getSettings();

    expect(updated.resolution).toBe('low');
    expect(updated.quality).toBe(original.quality); // Other settings unchanged
  });

  test('should provide correct resolutions', () => {
    const low = service.getResolution('low');
    const medium = service.getResolution('medium');
    const high = service.getResolution('high');

    expect(low).toEqual([640, 480]);
    expect(medium).toEqual([1280, 720]);
    expect(high).toEqual([1920, 1080]);
  });

  test('should get photo by id', () => {
    const photos = service.getPhotos();
    const photo = service.getPhoto(photos[0].id);

    expect(photo?.id).toBe(photos[0].id);
  });

  test('should delete photo', () => {
    const photos = service.getPhotos();
    const before = service.getPhotoCount();

    service.deletePhoto(photos[0].id);
    const after = service.getPhotoCount();

    expect(after).toBe(before - 1);
  });

  test('should toggle favorite', () => {
    const photos = service.getPhotos();
    const photo = photos[0];
    const original = photo.isFavorite;

    service.toggleFavorite(photo.id);
    const updated = service.getPhoto(photo.id);

    expect(updated?.isFavorite).toBe(!original);
  });

  test('should get favorites', () => {
    const favorites = service.getFavorites();
    expect(Array.isArray(favorites)).toBe(true);
    expect(favorites.every(p => p.isFavorite)).toBe(true);
  });

  test('should share photo', async () => {
    const photos = service.getPhotos();
    const link = await service.sharePhoto(photos[0].id);

    expect(link).toContain('file://');
    expect(link).toContain(photos[0].path);
  });

  test('should return sorted photos by timestamp', () => {
    const photos = service.getPhotos();
    for (let i = 1; i < photos.length; i++) {
      expect(photos[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(photos[i].timestamp.getTime());
    }
  });

  test('should get photo count', () => {
    const count = service.getPhotoCount();
    const photos = service.getPhotos();

    expect(count).toBe(photos.length);
  });

  test('should calculate total size', () => {
    const total = service.getTotalSize();
    const photos = service.getPhotos();
    const calculated = photos.reduce((sum, p) => sum + p.size, 0);

    expect(total).toBe(calculated);
  });

  test('should delete all photos', () => {
    service.deleteAllPhotos();
    expect(service.getPhotoCount()).toBe(0);
  });

  test('should notify on photo captured', async () => {
    const captured: string[] = [];
    service.onPhotoCaptured((photo) => captured.push(photo.id));

    await service.capture();

    expect(captured.length).toBeGreaterThan(0);
  });

  test('should notify on photo deleted', () => {
    const deleted: string[] = [];
    service.onPhotoDeleted((photoId) => deleted.push(photoId));

    const photos = service.getPhotos();
    service.deletePhoto(photos[0].id);

    expect(deleted).toContain(photos[0].id);
  });

  test('should respect quality settings', async () => {
    service.updateSettings({ quality: 50 });
    const lowQuality = await service.capture();

    service.updateSettings({ quality: 100 });
    const highQuality = await service.capture();

    // High quality should result in larger file
    expect(highQuality!.size).toBeGreaterThan(lowQuality!.size);
  });

  test('should respect resolution settings', async () => {
    service.updateSettings({ resolution: 'low' });
    const lowRes = await service.capture();

    service.updateSettings({ resolution: 'high' });
    const highRes = await service.capture();

    expect(highRes!.width).toBeGreaterThan(lowRes!.width);
    expect(highRes!.height).toBeGreaterThan(lowRes!.height);
  });
});
