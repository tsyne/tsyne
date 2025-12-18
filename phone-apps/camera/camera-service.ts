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
