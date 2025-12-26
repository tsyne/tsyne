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
 * Camera Service
 *
 * Manages photo capture, storage, and gallery operations.
 * Mock implementation simulates camera operations without actual hardware.
 */

export interface Photo {
  id: string;
  filename: string;
  path: string;
  timestamp: Date;
  width: number;
  height: number;
  size: number; // bytes
  isFavorite: boolean;
  thumbnailData?: string; // Base64 data for preview
}

export interface CameraSettings {
  resolution: 'low' | 'medium' | 'high'; // 640x480, 1280x720, 1920x1080
  quality: number; // 0-100
  flash: 'off' | 'on' | 'auto';
  timer: number; // 0=off, 3=3s, 5=5s, 10=10s
  gridLines: boolean;
  zoom: number; // 1-5x
  exposure: number; // -2 to +2
  hdr: boolean;
  whiteBalance: 'auto' | 'daylight' | 'cloudy' | 'tungsten' | 'fluorescent';
  filter: 'none' | 'bw' | 'sepia' | 'cool' | 'warm';
  nightMode: boolean;
  burstMode: boolean;
}

export type CameraMode = 'photo' | 'video'; // Video is infrastructure only

export interface ICameraService {
  // Camera control
  initialize(): Promise<boolean>;
  isAvailable(): boolean;
  capture(): Promise<Photo | null>;
  setMode(mode: CameraMode): void;
  getMode(): CameraMode;

  // Camera settings
  getSettings(): CameraSettings;
  updateSettings(settings: Partial<CameraSettings>): void;
  getResolution(res: 'low' | 'medium' | 'high'): [number, number];

  // Photo library
  getPhotos(): Photo[];
  getPhoto(id: string): Photo | null;
  deletePhoto(id: string): boolean;
  toggleFavorite(id: string): boolean;
  getFavorites(): Photo[];

  // Photo operations
  sharePhoto(id: string): Promise<string>; // returns share link
  deleteAllPhotos(): boolean;

  // Stats
  getPhotoCount(): number;
  getTotalSize(): number;

  // Listeners
  onPhotoCaptured(callback: (photo: Photo) => void): () => void;
  onPhotoDeleted(callback: (photoId: string) => void): () => void;
}

/**
 * Mock Camera Service for testing
 */
export class MockCameraService implements ICameraService {
  private available = true;
  private mode: CameraMode = 'photo';
  private settings: CameraSettings = {
    resolution: 'high',
    quality: 85,
    flash: 'auto',
    timer: 0,
    gridLines: true,
    zoom: 1,
    exposure: 0,
    hdr: false,
    whiteBalance: 'auto',
    filter: 'none',
    nightMode: false,
    burstMode: false,
  };
  private photos: Map<string, Photo> = new Map();
  private nextPhotoId = 1;
  private captureListeners: Array<(photo: Photo) => void> = [];
  private deleteListeners: Array<(photoId: string) => void> = [];

  constructor() {
    this.initializeSamplePhotos();
  }

  private initializeSamplePhotos(): void {
    const now = new Date();

    // Sample photos
    this.photos.set('photo-1', {
      id: 'photo-1',
      filename: 'photo_20240115_143022.jpg',
      path: '/storage/DCIM/photo_20240115_143022.jpg',
      timestamp: new Date(now.getTime() - 86400000),
      width: 1920,
      height: 1080,
      size: 1024 * 512,
      isFavorite: true,
    });

    this.photos.set('photo-2', {
      id: 'photo-2',
      filename: 'photo_20240114_102145.jpg',
      path: '/storage/DCIM/photo_20240114_102145.jpg',
      timestamp: new Date(now.getTime() - 172800000),
      width: 1920,
      height: 1080,
      size: 1024 * 640,
      isFavorite: false,
    });

    this.photos.set('photo-3', {
      id: 'photo-3',
      filename: 'photo_20240113_180530.jpg',
      path: '/storage/DCIM/photo_20240113_180530.jpg',
      timestamp: new Date(now.getTime() - 259200000),
      width: 1920,
      height: 1080,
      size: 1024 * 480,
      isFavorite: true,
    });

    this.nextPhotoId = 4;
  }

  async initialize(): Promise<boolean> {
    console.log('[MockCamera] Initializing camera...');
    this.available = true;
    return true;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async capture(): Promise<Photo | null> {
    if (!this.available) return null;

    // Simulate capture delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const [width, height] = this.getResolution(this.settings.resolution);
    const photo: Photo = {
      id: `photo-${this.nextPhotoId++}`,
      filename: `photo_${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}.jpg`,
      path: `/storage/DCIM/photo_${new Date().getTime()}.jpg`,
      timestamp: new Date(),
      width,
      height,
      size: Math.floor((width * height * 3 * this.settings.quality) / 100),
      isFavorite: false,
    };

    this.photos.set(photo.id, photo);
    this.notifyPhotoCaptured(photo);
    console.log(`[MockCamera] Photo captured: ${photo.filename}`);

    return photo;
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  getMode(): CameraMode {
    return this.mode;
  }

  getSettings(): CameraSettings {
    return { ...this.settings };
  }

  updateSettings(settings: Partial<CameraSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  getResolution(res: 'low' | 'medium' | 'high'): [number, number] {
    switch (res) {
      case 'low':
        return [640, 480];
      case 'medium':
        return [1280, 720];
      case 'high':
        return [1920, 1080];
    }
  }

  getPhotos(): Photo[] {
    return Array.from(this.photos.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getPhoto(id: string): Photo | null {
    return this.photos.get(id) || null;
  }

  deletePhoto(id: string): boolean {
    const result = this.photos.delete(id);
    if (result) this.notifyPhotoDeleted(id);
    return result;
  }

  toggleFavorite(id: string): boolean {
    const photo = this.photos.get(id);
    if (!photo) return false;
    photo.isFavorite = !photo.isFavorite;
    return true;
  }

  getFavorites(): Photo[] {
    return this.getPhotos().filter(p => p.isFavorite);
  }

  async sharePhoto(id: string): Promise<string> {
    const photo = this.photos.get(id);
    if (!photo) throw new Error('Photo not found');
    const shareLink = `file://${photo.path}`;
    console.log(`[MockCamera] Sharing photo: ${shareLink}`);
    return shareLink;
  }

  deleteAllPhotos(): boolean {
    if (this.photos.size === 0) return false;
    const ids = Array.from(this.photos.keys());
    ids.forEach(id => this.deletePhoto(id));
    return true;
  }

  getPhotoCount(): number {
    return this.photos.size;
  }

  getTotalSize(): number {
    return Array.from(this.photos.values()).reduce((sum, p) => sum + p.size, 0);
  }

  onPhotoCaptured(callback: (photo: Photo) => void): () => void {
    this.captureListeners.push(callback);
    return () => {
      const idx = this.captureListeners.indexOf(callback);
      if (idx >= 0) this.captureListeners.splice(idx, 1);
    };
  }

  onPhotoDeleted(callback: (photoId: string) => void): () => void {
    this.deleteListeners.push(callback);
    return () => {
      const idx = this.deleteListeners.indexOf(callback);
      if (idx >= 0) this.deleteListeners.splice(idx, 1);
    };
  }

  private notifyPhotoCaptured(photo: Photo): void {
    for (const listener of this.captureListeners) {
      listener(photo);
    }
  }

  private notifyPhotoDeleted(photoId: string): void {
    for (const listener of this.deleteListeners) {
      listener(photoId);
    }
  }
}
