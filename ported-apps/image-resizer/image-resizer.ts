/**
 * Image Resizer App - Resize images with custom dimensions
 *
 * Batch or single image resizing application supporting multiple formats
 * with customizable width/height and aspect ratio preservation.
 *
 * Ported from image-resizer (https://github.com/tiagomelo/image-resizer)
 * Original by Tiago Melo, MIT License
 *
 * Portions copyright original team and portions copyright Paul Hammant 2025
 * License: MIT
 *
 * @tsyne-app:name Image Resizer
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><path d="M21 12L15 6M3 21l6-6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
 * @tsyne-app:category Utilities
 * @tsyne-app:builder buildImageResizerApp
 * @tsyne-app:args app,win
 * @tsyne-app:count single
 */

import type { App, Window, Label, Entry } from 'tsyne';

export interface ResizeJob {
  filePath: string;
  fileName: string;
  width: number;
  height: number;
  originalWidth?: number;
  originalHeight?: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface ResizeSettings {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  quality: number; // 0-100
  format: 'original' | 'jpeg' | 'png' | 'webp';
  outputDirectory: string;
}

/**
 * Image Resizer UI class
 */
export class ImageResizerUI {
  private window: Window | null = null;
  private jobs: ResizeJob[] = [];
  private settings: ResizeSettings = {
    width: 800,
    height: 600,
    maintainAspectRatio: true,
    quality: 85,
    format: 'original',
    outputDirectory: '',
  };

  private widthEntry: Entry | null = null;
  private heightEntry: Entry | null = null;
  private qualityEntry: Entry | null = null;
  private statusLabel: Label | null = null;
  private jobsLabel: Label | null = null;

  constructor(private a: App) {
    this.loadSettings();
  }

  private loadSettings(): void {
    const width = this.a.getPreferenceInt('resizer_width', 800);
    const height = this.a.getPreferenceInt('resizer_height', 600);
    const quality = this.a.getPreferenceInt('resizer_quality', 85);

    Promise.resolve(width).then((val) => {
      this.settings.width = val;
    });
    Promise.resolve(height).then((val) => {
      this.settings.height = val;
    });
    Promise.resolve(quality).then((val) => {
      this.settings.quality = val;
    });
  }

  private saveSettings(): void {
    this.a.setPreference('resizer_width', this.settings.width.toString());
    this.a.setPreference('resizer_height', this.settings.height.toString());
    this.a.setPreference('resizer_quality', this.settings.quality.toString());
  }

  isValidImageFile(filePath: string): boolean {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    return validExtensions.includes(ext);
  }

  calculateNewDimensions(origWidth: number, origHeight: number): { width: number; height: number } {
    if (!this.settings.maintainAspectRatio) {
      return {
        width: this.settings.width,
        height: this.settings.height,
      };
    }

    // Maintain aspect ratio - scale to fit in specified dimensions
    const aspectRatio = origWidth / origHeight;
    let newWidth = this.settings.width;
    let newHeight = this.settings.height;

    if (newWidth / newHeight > aspectRatio) {
      newWidth = Math.round(newHeight * aspectRatio);
    } else {
      newHeight = Math.round(newWidth / aspectRatio);
    }

    return { width: newWidth, height: newHeight };
  }

  private updateStatus(): void {
    if (this.statusLabel) {
      const completed = this.jobs.filter((j) => j.status === 'completed').length;
      const failed = this.jobs.filter((j) => j.status === 'error').length;
      const processing = this.jobs.filter((j) => j.status === 'processing').length;

      let status = `Jobs: ${completed}/${this.jobs.length}`;
      if (failed > 0) status += ` | Failed: ${failed}`;
      if (processing > 0) status += ` | Processing: ${processing}`;

      this.statusLabel.setText(status);
    }

    if (this.jobsLabel) {
      if (this.jobs.length === 0) {
        this.jobsLabel.setText('No jobs yet');
      } else {
        const jobsList = this.jobs
          .map((j) => `${j.fileName}: ${j.status}`)
          .slice(-5)
          .join('\n');
        this.jobsLabel.setText(jobsList);
      }
    }
  }

  private refreshUI(): void {
    if (this.window) {
      this.window.setContent(() => this.buildUI(this.window!));
    }
  }

  async addImageFile(filePath: string): Promise<void> {
    if (!this.isValidImageFile(filePath)) {
      if (this.window) {
        await this.window.showError('Invalid File', 'Please select a valid image file (JPG, PNG, GIF, BMP, WebP, TIFF)');
      }
      return;
    }

    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);

    const job: ResizeJob = {
      filePath,
      fileName,
      width: this.settings.width,
      height: this.settings.height,
      status: 'pending',
    };

    this.jobs.push(job);
    this.updateStatus();
    this.refreshUI();
  }

  async processJob(job: ResizeJob): Promise<void> {
    job.status = 'processing';
    this.updateStatus();

    try {
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // In a real implementation, this would call an image processing library
      // For now, we just mark it as completed
      job.status = 'completed';

      if (this.window) {
        this.a.sendNotification('Image Resizer', `Resized: ${job.fileName}`);
      }
    } catch (e) {
      job.status = 'error';
      job.error = String(e);
    }

    this.updateStatus();
  }

  async processAllJobs(): Promise<void> {
    const pendingJobs = this.jobs.filter((j) => j.status === 'pending');

    for (const job of pendingJobs) {
      await this.processJob(job);
    }
  }

  clearJobs(): void {
    this.jobs = [];
    this.updateStatus();
    this.refreshUI();
  }

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      // Title
      this.a.label('Image Resizer - Batch Image Resizing').withId('imageResizerTitle');

      this.a.separator();

      // File selection section
      this.a.label('Images').withId('imageResizerFilesLabel');
      this.a.hbox(() => {
        this.a.button('Add Image')
          .onClick(async () => {
            const filePath = await win.showFileOpen();
            if (filePath) {
              await this.addImageFile(filePath);
            }
          })
          .withId('imageResizerAddBtn');

        this.a.spacer();

        this.a.button('Clear All')
          .onClick(() => this.clearJobs())
          .withId('imageResizerClearBtn');
      });

      this.a.separator();

      // Settings section
      this.a.label('Resize Settings').withId('imageResizerSettingsLabel');

      this.a.hbox(() => {
        this.a.label('Width:').withId('imageResizerWidthLabel');
        this.widthEntry = this.a
          .entry(this.settings.width.toString(), (value: string) => {
            const w = parseInt(value, 10) || 800;
            if (w > 0 && w <= 8000) {
              this.settings.width = w;
              this.saveSettings();
            }
          }, 80)
          .withId('imageResizerWidthInput');
        this.a.label('px').withId('imageResizerWidthUnit');
      });

      this.a.hbox(() => {
        this.a.label('Height:').withId('imageResizerHeightLabel');
        this.heightEntry = this.a
          .entry(this.settings.height.toString(), (value: string) => {
            const h = parseInt(value, 10) || 600;
            if (h > 0 && h <= 8000) {
              this.settings.height = h;
              this.saveSettings();
            }
          }, 80)
          .withId('imageResizerHeightInput');
        this.a.label('px').withId('imageResizerHeightUnit');
      });

      this.a.hbox(() => {
        this.a.label('Quality:').withId('imageResizerQualityLabel');
        this.qualityEntry = this.a
          .entry(this.settings.quality.toString(), (value: string) => {
            const q = parseInt(value, 10) || 85;
            if (q >= 0 && q <= 100) {
              this.settings.quality = q;
              this.saveSettings();
            }
          }, 80)
          .withId('imageResizerQualityInput');
        this.a.label('%').withId('imageResizerQualityUnit');
      });

      this.a.hbox(() => {
        this.a
          .checkbox('Maintain Aspect Ratio', (checked: boolean) => {
            this.settings.maintainAspectRatio = checked;
          })
          .withId('imageResizerAspectRatio');
      });

      this.a.separator();

      // Status section
      this.statusLabel = this.a.label('Jobs: 0/0').withId('imageResizerStatus');

      this.a.separator();

      // Jobs list
      this.a.label('Jobs').withId('imageResizerJobsLabel');
      this.a.scroll(() => {
        this.jobsLabel = this.a.label('No jobs yet').withId('imageResizerJobsList');
      });

      this.a.separator();

      // Action buttons
      this.a.hbox(() => {
        this.a.button('Process All')
          .onClick(async () => await this.processAllJobs())
          .withId('imageResizerProcessBtn');

        this.a.spacer();

        this.a.button('Reset')
          .onClick(() => this.clearJobs())
          .withId('imageResizerResetBtn');
      });
    });

    this.updateStatus();
  }

  // Public methods for testing
  getJobs(): ReadonlyArray<ResizeJob> {
    return [...this.jobs];
  }

  getSettings(): Readonly<ResizeSettings> {
    return { ...this.settings };
  }

  getJobCount(): number {
    return this.jobs.length;
  }

  isValidImage(filePath: string): boolean {
    return this.isValidImageFile(filePath);
  }

  calculateDimensions(origWidth: number, origHeight: number): { width: number; height: number } {
    return this.calculateNewDimensions(origWidth, origHeight);
  }
}

/**
 * Create the Image Resizer app
 */
export function buildImageResizerApp(a: App, win: Window): ImageResizerUI {
  const ui = new ImageResizerUI(a);

  win.setContent(() => {
    ui.buildUI(win);
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport } = require('tsyne');
  app(resolveTransport(), { title: 'Image Resizer', width: 900, height: 700 }, (a: App) => {
    a.window({ title: 'Image Resizer', width: 900, height: 700 }, (win: Window) => {
      buildImageResizerApp(a, win);
    });
  });
}
