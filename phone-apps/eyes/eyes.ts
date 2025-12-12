/**
 * Eyes - Animated Eyes Following Mouse
 *
 * Ported from ChrysaLisp: https://github.com/vygr/ChrysaLisp/blob/master/apps/eyes/app.lisp
 * Original authors: ChrysaLisp contributors
 * License: See original repository
 *
 * An animated eyes display that follows the mouse cursor.
 *
 * @tsyne-app:name Eyes
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/></svg>
 * @tsyne-app:category fun
 * @tsyne-app:builder createEyesApp
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { TappableCanvasRaster } from '../../core/src/widgets/canvas';

// Default configuration
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 200;

// Colors as RGBA values
const SKY_BLUE: [number, number, number, number] = [135, 206, 235, 255];
const SCLERA_COLOR: [number, number, number, number] = [255, 255, 255, 255];
const SCLERA_OUTLINE: [number, number, number, number] = [51, 51, 51, 255];
const IRIS_COLOR: [number, number, number, number] = [76, 175, 80, 255]; // Green
const IRIS_OUTLINE: [number, number, number, number] = [46, 125, 50, 255];
const PUPIL_COLOR: [number, number, number, number] = [0, 0, 0, 255];
const HIGHLIGHT_COLOR: [number, number, number, number] = [255, 255, 255, 255];

// Scale factors
const IRIS_SCALE = 0.4; // Iris radius relative to eye
const PUPIL_SCALE = 0.5; // Pupil radius relative to iris
const HIGHLIGHT_SCALE = 0.2; // Highlight size relative to pupil

/**
 * Eyes class - manages the animated eyes
 */
export class Eyes {
  private width: number;
  private height: number;
  private mouseX: number = 0;
  private mouseY: number = 0;

  // Eye positions
  private leftEye: { x: number; y: number; radius: number } = { x: 0, y: 0, radius: 0 };
  private rightEye: { x: number; y: number; radius: number } = { x: 0, y: 0, radius: 0 };

  // Current iris positions (animated)
  private leftIrisOffset: { x: number; y: number } = { x: 0, y: 0 };
  private rightIrisOffset: { x: number; y: number } = { x: 0, y: 0 };

  constructor(width: number = DEFAULT_WIDTH, height: number = DEFAULT_HEIGHT) {
    this.width = width;
    this.height = height;
    this.calculateEyePositions();
    // Initialize mouse at center
    this.mouseX = width / 2;
    this.mouseY = height / 2;
  }

  private calculateEyePositions(): void {
    const eyeRadius = Math.min(this.width / 4, this.height / 2) * 0.8;
    const centerY = this.height / 2;

    this.leftEye = {
      x: this.width / 4,
      y: centerY,
      radius: eyeRadius,
    };

    this.rightEye = {
      x: (this.width * 3) / 4,
      y: centerY,
      radius: eyeRadius,
    };
  }

  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.calculateEyePositions();
  }

  setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    this.updateIrisPositions();
  }

  private updateIrisPositions(): void {
    this.leftIrisOffset = this.calculateIrisOffset(this.leftEye);
    this.rightIrisOffset = this.calculateIrisOffset(this.rightEye);
  }

  private calculateIrisOffset(eye: { x: number; y: number; radius: number }): { x: number; y: number } {
    const dx = this.mouseX - eye.x;
    const dy = this.mouseY - eye.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return { x: 0, y: 0 };
    }

    // Maximum offset is the eye radius minus the iris radius
    const maxOffset = eye.radius * (1 - IRIS_SCALE);

    // Calculate normalized offset
    const scale = Math.min(distance, maxOffset * 2) / (maxOffset * 2);
    const offsetX = (dx / distance) * maxOffset * scale;
    const offsetY = (dy / distance) * maxOffset * scale;

    return { x: offsetX, y: offsetY };
  }

  getLeftEye(): { x: number; y: number; radius: number } {
    return this.leftEye;
  }

  getRightEye(): { x: number; y: number; radius: number } {
    return this.rightEye;
  }

  getLeftIrisOffset(): { x: number; y: number } {
    return this.leftIrisOffset;
  }

  getRightIrisOffset(): { x: number; y: number } {
    return this.rightIrisOffset;
  }

  getIrisRadius(eyeRadius: number): number {
    return eyeRadius * IRIS_SCALE;
  }

  getPupilRadius(irisRadius: number): number {
    return irisRadius * PUPIL_SCALE;
  }

  getHighlightRadius(pupilRadius: number): number {
    return pupilRadius * HIGHLIGHT_SCALE;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }
}

/**
 * Render eyes to a pixel buffer
 */
function renderEyes(eyes: Eyes, buffer: Uint8Array): void {
  const width = eyes.getWidth();
  const height = eyes.getHeight();

  // Fill background with sky blue
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = SKY_BLUE[0];
    buffer[i + 1] = SKY_BLUE[1];
    buffer[i + 2] = SKY_BLUE[2];
    buffer[i + 3] = SKY_BLUE[3];
  }

  const leftEye = eyes.getLeftEye();
  const rightEye = eyes.getRightEye();
  const leftOffset = eyes.getLeftIrisOffset();
  const rightOffset = eyes.getRightIrisOffset();

  const irisRadius = eyes.getIrisRadius(leftEye.radius);
  const pupilRadius = eyes.getPupilRadius(irisRadius);
  const highlightRadius = eyes.getHighlightRadius(pupilRadius);

  // Helper to draw a filled circle
  const fillCircle = (cx: number, cy: number, r: number, color: [number, number, number, number]) => {
    const r2 = r * r;
    for (let py = Math.max(0, Math.floor(cy - r)); py <= Math.min(height - 1, Math.ceil(cy + r)); py++) {
      for (let px = Math.max(0, Math.floor(cx - r)); px <= Math.min(width - 1, Math.ceil(cx + r)); px++) {
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy <= r2) {
          const idx = (py * width + px) * 4;
          buffer[idx] = color[0];
          buffer[idx + 1] = color[1];
          buffer[idx + 2] = color[2];
          buffer[idx + 3] = color[3];
        }
      }
    }
  };

  // Helper to draw a circle outline
  const strokeCircle = (cx: number, cy: number, r: number, color: [number, number, number, number], strokeWidth: number = 2) => {
    const outerR2 = r * r;
    const innerR2 = (r - strokeWidth) * (r - strokeWidth);
    for (let py = Math.max(0, Math.floor(cy - r)); py <= Math.min(height - 1, Math.ceil(cy + r)); py++) {
      for (let px = Math.max(0, Math.floor(cx - r)); px <= Math.min(width - 1, Math.ceil(cx + r)); px++) {
        const dx = px - cx;
        const dy = py - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 <= outerR2 && d2 >= innerR2) {
          const idx = (py * width + px) * 4;
          buffer[idx] = color[0];
          buffer[idx + 1] = color[1];
          buffer[idx + 2] = color[2];
          buffer[idx + 3] = color[3];
        }
      }
    }
  };

  // Draw left eye
  fillCircle(leftEye.x, leftEye.y, leftEye.radius, SCLERA_COLOR);
  strokeCircle(leftEye.x, leftEye.y, leftEye.radius, SCLERA_OUTLINE, 2);
  fillCircle(leftEye.x + leftOffset.x, leftEye.y + leftOffset.y, irisRadius, IRIS_COLOR);
  strokeCircle(leftEye.x + leftOffset.x, leftEye.y + leftOffset.y, irisRadius, IRIS_OUTLINE, 1);
  fillCircle(leftEye.x + leftOffset.x, leftEye.y + leftOffset.y, pupilRadius, PUPIL_COLOR);
  fillCircle(leftEye.x + leftOffset.x - pupilRadius * 0.3, leftEye.y + leftOffset.y - pupilRadius * 0.3, highlightRadius, HIGHLIGHT_COLOR);

  // Draw right eye
  fillCircle(rightEye.x, rightEye.y, rightEye.radius, SCLERA_COLOR);
  strokeCircle(rightEye.x, rightEye.y, rightEye.radius, SCLERA_OUTLINE, 2);
  fillCircle(rightEye.x + rightOffset.x, rightEye.y + rightOffset.y, irisRadius, IRIS_COLOR);
  strokeCircle(rightEye.x + rightOffset.x, rightEye.y + rightOffset.y, irisRadius, IRIS_OUTLINE, 1);
  fillCircle(rightEye.x + rightOffset.x, rightEye.y + rightOffset.y, pupilRadius, PUPIL_COLOR);
  fillCircle(rightEye.x + rightOffset.x - pupilRadius * 0.3, rightEye.y + rightOffset.y - pupilRadius * 0.3, highlightRadius, HIGHLIGHT_COLOR);
}

/**
 * Eyes UI class
 */
export class EyesUI {
  private a: App;
  private win: Window | null = null;
  private eyes: Eyes;
  private canvasWidth: number = DEFAULT_WIDTH;
  private canvasHeight: number = DEFAULT_HEIGHT;
  private canvas: TappableCanvasRaster | null = null;
  private pixelBuffer: Uint8Array;
  private trackingMouse: boolean = true;

  constructor(a: App) {
    this.a = a;
    this.eyes = new Eyes(this.canvasWidth, this.canvasHeight);
    this.pixelBuffer = new Uint8Array(this.canvasWidth * this.canvasHeight * 4);
  }

  private async updateCanvas(): Promise<void> {
    if (!this.canvas) return;
    renderEyes(this.eyes, this.pixelBuffer);
    await this.canvas.setPixelBuffer(this.pixelBuffer);
  }

  cleanup(): void {
    // Nothing to clean up now that we don't have animation
  }

  buildUI(win: Window): void {
    this.win = win;

    this.a.vbox(() => {
      this.a.center(() => {
        this.canvas = this.a.tappableCanvasRaster(this.canvasWidth, this.canvasHeight, {
          onMouseMove: (x, y) => {
            if (this.trackingMouse) {
              this.eyes.setMousePosition(x, y);
              this.updateCanvas();
            }
          },
          onTap: (x, y) => {
            // Toggle tracking mode on tap
            this.trackingMouse = !this.trackingMouse;
          }
        });
      });

      this.a.separator();

      this.a.label('Move mouse over the eyes - tap to toggle tracking');
    });

    // Initial render
    this.updateCanvas();
  }
}

/**
 * Create the Eyes app
 */
export function createEyesApp(a: App): EyesUI {
  const ui = new EyesUI(a);

  a.registerCleanup(() => ui.cleanup());

  a.window({ title: 'Eyes', width: 450, height: 300 }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

// Eyes class is already exported above

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Eyes' }, async (a: App) => {
    createEyesApp(a);
    await a.run();
  });
}
