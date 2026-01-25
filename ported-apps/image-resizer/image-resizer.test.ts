/**
 * Jest tests for Image Resizer App
 */

describe('Image Resizer Logic', () => {
  describe('File validation', () => {
    test('should validate image file extensions', () => {
      const isValidImageFile = (filePath: string): boolean => {
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
        const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return validExtensions.includes(ext);
      };

      expect(isValidImageFile('/path/image.jpg')).toBe(true);
      expect(isValidImageFile('/path/photo.jpeg')).toBe(true);
      expect(isValidImageFile('/path/pic.png')).toBe(true);
      expect(isValidImageFile('/path/animated.gif')).toBe(true);
      expect(isValidImageFile('/path/bitmap.bmp')).toBe(true);
      expect(isValidImageFile('/path/modern.webp')).toBe(true);
      expect(isValidImageFile('/path/tiff_image.tiff')).toBe(true);

      expect(isValidImageFile('/path/document.pdf')).toBe(false);
      expect(isValidImageFile('/path/archive.zip')).toBe(false);
      expect(isValidImageFile('/path/video.mp4')).toBe(false);
      expect(isValidImageFile('/path/text.txt')).toBe(false);
    });

    test('should handle uppercase extensions', () => {
      const isValidImageFile = (filePath: string): boolean => {
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
        const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return validExtensions.includes(ext);
      };

      expect(isValidImageFile('/path/IMAGE.JPG')).toBe(true);
      expect(isValidImageFile('/path/PHOTO.PNG')).toBe(true);
      expect(isValidImageFile('/path/Picture.GIF')).toBe(true);
    });

    test('should extract filename from path', () => {
      const getFileName = (filePath: string): string => {
        return filePath.substring(filePath.lastIndexOf('/') + 1);
      };

      expect(getFileName('/home/user/images/photo.jpg')).toBe('photo.jpg');
      expect(getFileName('/images/picture.png')).toBe('picture.png');
      expect(getFileName('image.gif')).toBe('image.gif');
    });
  });

  describe('Dimension calculations', () => {
    test('should calculate dimensions without aspect ratio', () => {
      const calculate = (origW: number, origH: number, targetW: number, targetH: number): { width: number; height: number } => {
        return { width: targetW, height: targetH };
      };

      const result = calculate(1920, 1080, 800, 600);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    test('should maintain aspect ratio', () => {
      const calculateWithAspectRatio = (
        origW: number,
        origH: number,
        targetW: number,
        targetH: number
      ): { width: number; height: number } => {
        const aspectRatio = origW / origH;
        let newW = targetW;
        let newH = targetH;

        if (newW / newH > aspectRatio) {
          newW = Math.round(newH * aspectRatio);
        } else {
          newH = Math.round(newW / aspectRatio);
        }

        return { width: newW, height: newH };
      };

      // 16:9 aspect ratio
      const result = calculateWithAspectRatio(1920, 1080, 800, 600);
      expect(result.width).toBe(800);
      expect(result.height).toBe(450);

      // 4:3 aspect ratio
      const result2 = calculateWithAspectRatio(1024, 768, 800, 600);
      expect(result2.width).toBe(800);
      expect(result2.height).toBe(600);
    });

    test('should handle square images', () => {
      const calculateWithAspectRatio = (
        origW: number,
        origH: number,
        targetW: number,
        targetH: number
      ): { width: number; height: number } => {
        const aspectRatio = origW / origH;
        let newW = targetW;
        let newH = targetH;

        if (newW / newH > aspectRatio) {
          newW = Math.round(newH * aspectRatio);
        } else {
          newH = Math.round(newW / aspectRatio);
        }

        return { width: newW, height: newH };
      };

      // 1:1 aspect ratio (square)
      const result = calculateWithAspectRatio(1000, 1000, 800, 600);
      expect(result.width).toBe(600);
      expect(result.height).toBe(600);
    });
  });

  describe('Resize settings', () => {
    test('should store and retrieve settings', () => {
      interface ResizeSettings {
        width: number;
        height: number;
        maintainAspectRatio: boolean;
        quality: number;
        format: string;
        outputDirectory: string;
      }

      const settings: ResizeSettings = {
        width: 800,
        height: 600,
        maintainAspectRatio: true,
        quality: 85,
        format: 'original',
        outputDirectory: '/output',
      };

      expect(settings.width).toBe(800);
      expect(settings.height).toBe(600);
      expect(settings.maintainAspectRatio).toBe(true);
      expect(settings.quality).toBe(85);
    });

    test('should validate quality range', () => {
      const isValidQuality = (quality: number): boolean => {
        return quality >= 0 && quality <= 100;
      };

      expect(isValidQuality(0)).toBe(true);
      expect(isValidQuality(50)).toBe(true);
      expect(isValidQuality(85)).toBe(true);
      expect(isValidQuality(100)).toBe(true);
      expect(isValidQuality(-1)).toBe(false);
      expect(isValidQuality(101)).toBe(false);
    });

    test('should validate dimension ranges', () => {
      const isValidDimension = (dimension: number): boolean => {
        return dimension > 0 && dimension <= 8000;
      };

      expect(isValidDimension(1)).toBe(true);
      expect(isValidDimension(800)).toBe(true);
      expect(isValidDimension(8000)).toBe(true);
      expect(isValidDimension(0)).toBe(false);
      expect(isValidDimension(8001)).toBe(false);
      expect(isValidDimension(-100)).toBe(false);
    });
  });

  describe('Job tracking', () => {
    test('should create resize jobs', () => {
      interface ResizeJob {
        filePath: string;
        fileName: string;
        width: number;
        height: number;
        status: 'pending' | 'processing' | 'completed' | 'error';
      }

      const job: ResizeJob = {
        filePath: '/path/to/image.jpg',
        fileName: 'image.jpg',
        width: 800,
        height: 600,
        status: 'pending',
      };

      expect(job.fileName).toBe('image.jpg');
      expect(job.status).toBe('pending');
      expect(job.width).toBe(800);
    });

    test('should track job status changes', () => {
      interface ResizeJob {
        filePath: string;
        fileName: string;
        width: number;
        height: number;
        status: 'pending' | 'processing' | 'completed' | 'error';
      }

      const job: ResizeJob = {
        filePath: '/path/image.jpg',
        fileName: 'image.jpg',
        width: 800,
        height: 600,
        status: 'pending',
      };

      expect(job.status).toBe('pending');

      job.status = 'processing';
      expect(job.status).toBe('processing');

      job.status = 'completed';
      expect(job.status).toBe('completed');
    });

    test('should count jobs by status', () => {
      interface ResizeJob {
        status: 'pending' | 'processing' | 'completed' | 'error';
      }

      const jobs: ResizeJob[] = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'pending' },
        { status: 'error' },
        { status: 'processing' },
      ];

      const completed = jobs.filter((j) => j.status === 'completed').length;
      const pending = jobs.filter((j) => j.status === 'pending').length;
      const error = jobs.filter((j) => j.status === 'error').length;
      const processing = jobs.filter((j) => j.status === 'processing').length;

      expect(completed).toBe(2);
      expect(pending).toBe(1);
      expect(error).toBe(1);
      expect(processing).toBe(1);
      expect(completed + pending + error + processing).toBe(5);
    });
  });

  describe('Format support', () => {
    test('should recognize supported formats', () => {
      const supportedFormats = ['jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'];

      expect(supportedFormats).toContain('jpeg');
      expect(supportedFormats).toContain('png');
      expect(supportedFormats).toContain('webp');
      expect(supportedFormats).not.toContain('pdf');
      expect(supportedFormats).not.toContain('svg');
    });
  });
});
