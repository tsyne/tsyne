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
    tsyneTest = new TsyneTest({ headed: process.env.TSYNE_HEADED === '1' });
    camera = new MockCameraService();
    await camera.initialize();
  });

  afterEach(() => tsyneTest.cleanup());

  const run = async () => {
    const app = await tsyneTest.createApp((a) => createCameraApp(a, camera));
    ctx = tsyneTest.getContext();
    await app.run();
  };

  const elements = [
    'camera-title',
    'preview-placeholder',
    'btn-capture',
    'camera-status',
    'btn-resolution',
    'btn-flash',
    'slider-zoom',
    'slider-exposure',
    'btn-white-balance',
    'btn-filter',
    'btn-timer',
    'btn-hdr',
    'btn-night',
    'btn-grid',
    'btn-burst',
    'photo-count-display',
    'btn-clear-all',
    'btn-refresh',
  ];

  test.each(elements)('should display %s', async (id) => {
    await run();
    await ctx.getById(id).within(500).shouldExist();
  });

  test('should show Ready status on startup', async () => {
    await run();
    await ctx.getById('camera-status').within(500).shouldBe('Ready');
  });

  test('should have initial photos loaded', async () => {
    await run();
    expect(camera.getPhotoCount()).toBeGreaterThan(0);
  });

  test('should take screenshot for documentation', async () => {
    await run();
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = '/tmp/camera-screenshot.png';
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Camera screenshot saved: ${screenshotPath}`);
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

  test('should initialize', async () => {
    expect(await service.initialize()).toBe(true);
    expect(service.isAvailable()).toBe(true);
    expect(service.getPhotoCount()).toBeGreaterThan(0);
  });

  test('should capture photo and increment count', async () => {
    const before = service.getPhotoCount();
    const photo = await service.capture();
    expect(service.getPhotoCount()).toBe(before + 1);
    expect(photo?.id).toBeTruthy();
  });

  test('should capture with correct properties', async () => {
    const photo = await service.capture();
    expect(photo).toMatchObject({
      filename: expect.any(String),
      path: expect.any(String),
      width: expect.any(Number),
      height: expect.any(Number),
      size: expect.any(Number),
      isFavorite: false,
    });
  });

  test('should manage camera mode', () => {
    service.setMode('photo');
    expect(service.getMode()).toBe('photo');
  });

  test.each([
    ['resolution', { resolution: 'low' as const }],
    ['flash', { flash: 'on' as const }],
    ['zoom', { zoom: 2 }],
    ['exposure', { exposure: 1 }],
    ['hdr', { hdr: true }],
    ['whiteBalance', { whiteBalance: 'daylight' as const }],
    ['filter', { filter: 'bw' as const }],
    ['nightMode', { nightMode: true }],
    ['burstMode', { burstMode: true }],
  ])('should update %s setting', (name, update) => {
    const before = service.getSettings();
    service.updateSettings(update);
    const after = service.getSettings();
    expect(after).toMatchObject(update);
    // Verify other settings unchanged
    const otherKeys = Object.keys(before).filter(k => !Object.keys(update).includes(k));
    otherKeys.forEach(key => {
      expect(after[key as keyof typeof before]).toEqual(before[key as keyof typeof before]);
    });
  });

  test.each([
    ['low', [640, 480]],
    ['medium', [1280, 720]],
    ['high', [1920, 1080]],
  ])('resolution %s should return %p', (res, expected) => {
    expect(service.getResolution(res as any)).toEqual(expected);
  });

  test('should manage photos', () => {
    const photos = service.getPhotos();
    const id = photos[0].id;
    expect(service.getPhoto(id)?.id).toBe(id);

    service.deletePhoto(id);
    expect(service.getPhoto(id)).toBeNull();
    expect(service.getPhotoCount()).toBe(photos.length - 1);
  });

  test('should sort photos by timestamp (newest first)', () => {
    const photos = service.getPhotos();
    for (let i = 1; i < photos.length; i++) {
      expect(photos[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(photos[i].timestamp.getTime());
    }
  });

  test('should toggle favorite', () => {
    const photos = service.getPhotos();
    const id = photos[0].id;
    const original = service.getPhoto(id)?.isFavorite;

    service.toggleFavorite(id);
    expect(service.getPhoto(id)?.isFavorite).toBe(!original);
  });

  test('should get favorites only', () => {
    const favs = service.getFavorites();
    expect(favs.every(p => p.isFavorite)).toBe(true);
  });

  test('should share photo with file:// URI', async () => {
    const photos = service.getPhotos();
    const link = await service.sharePhoto(photos[0].id);
    expect(link).toContain('file://');
    expect(link).toContain(photos[0].path);
  });

  test('should delete all photos', () => {
    service.deleteAllPhotos();
    expect(service.getPhotoCount()).toBe(0);
  });

  test('should calculate total size correctly', () => {
    const total = service.getTotalSize();
    const calculated = service.getPhotos().reduce((sum, p) => sum + p.size, 0);
    expect(total).toBe(calculated);
  });

  test('should notify on photo capture', async () => {
    const captured: string[] = [];
    service.onPhotoCaptured((photo) => captured.push(photo.id));
    await service.capture();
    expect(captured.length).toBe(1);
  });

  test('should notify on photo delete', () => {
    const deleted: string[] = [];
    service.onPhotoDeleted((id) => deleted.push(id));
    const photoId = service.getPhotos()[0].id;
    service.deletePhoto(photoId);
    expect(deleted).toContain(photoId);
  });

  test('quality affects file size', async () => {
    service.updateSettings({ quality: 50 });
    const low = await service.capture();
    service.updateSettings({ quality: 100 });
    const high = await service.capture();
    expect(high!.size).toBeGreaterThan(low!.size);
  });

  test('resolution affects dimensions', async () => {
    service.updateSettings({ resolution: 'low' });
    const lowRes = await service.capture();
    service.updateSettings({ resolution: 'high' });
    const highRes = await service.capture();
    expect(highRes!.width).toBeGreaterThan(lowRes!.width);
    expect(highRes!.height).toBeGreaterThan(lowRes!.height);
  });
});
