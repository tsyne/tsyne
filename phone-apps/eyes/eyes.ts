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
import type { CanvasCircle, CanvasRaster } from '../../core/src/widgets/canvas';

// Default configuration
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 200;
const IRIS_COLOR = '#4CAF50'; // Green
const PUPIL_COLOR = '#000000'; // Black
const SCLERA_COLOR = '#FFFFFF'; // White
const HIGHLIGHT_COLOR = '#FFFFFF'; // White highlight

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
  private animationFrame: NodeJS.Timeout | null = null;

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
  private animationInterval: NodeJS.Timeout | null = null;

  // Canvas elements for dynamic updates
  private leftSclera: CanvasCircle | null = null;
  private rightSclera: CanvasCircle | null = null;
  private leftIris: CanvasCircle | null = null;
  private rightIris: CanvasCircle | null = null;
  private leftPupil: CanvasCircle | null = null;
  private rightPupil: CanvasCircle | null = null;
  private leftHighlight: CanvasCircle | null = null;
  private rightHighlight: CanvasCircle | null = null;

  constructor(a: App) {
    this.a = a;
    this.eyes = new Eyes(this.canvasWidth, this.canvasHeight);
  }

  private startAnimation(): void {
    // Simulate mouse movement for demo (since we can't track real mouse in canvas)
    let angle = 0;
    this.animationInterval = setInterval(() => {
      // Circular motion around center
      const centerX = this.canvasWidth / 2;
      const centerY = this.canvasHeight / 2;
      const radius = Math.min(this.canvasWidth, this.canvasHeight) * 0.3;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      this.eyes.setMousePosition(x, y);
      this.updateEyes();

      angle += 0.05;
    }, 33); // ~30 FPS
  }

  private stopAnimation(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }

  private updateEyes(): void {
    const leftEye = this.eyes.getLeftEye();
    const rightEye = this.eyes.getRightEye();
    const leftOffset = this.eyes.getLeftIrisOffset();
    const rightOffset = this.eyes.getRightIrisOffset();

    const irisRadius = this.eyes.getIrisRadius(leftEye.radius);
    const pupilRadius = this.eyes.getPupilRadius(irisRadius);
    const highlightRadius = this.eyes.getHighlightRadius(pupilRadius);

    // Update left iris position
    if (this.leftIris) {
      const x = leftEye.x + leftOffset.x;
      const y = leftEye.y + leftOffset.y;
      this.leftIris.update({
        x: x - irisRadius,
        y: y - irisRadius,
        x2: x + irisRadius,
        y2: y + irisRadius,
      });
    }

    // Update left pupil position
    if (this.leftPupil) {
      const x = leftEye.x + leftOffset.x;
      const y = leftEye.y + leftOffset.y;
      this.leftPupil.update({
        x: x - pupilRadius,
        y: y - pupilRadius,
        x2: x + pupilRadius,
        y2: y + pupilRadius,
      });
    }

    // Update left highlight position
    if (this.leftHighlight) {
      const x = leftEye.x + leftOffset.x - pupilRadius * 0.3;
      const y = leftEye.y + leftOffset.y - pupilRadius * 0.3;
      this.leftHighlight.update({
        x: x - highlightRadius,
        y: y - highlightRadius,
        x2: x + highlightRadius,
        y2: y + highlightRadius,
      });
    }

    // Update right iris position
    if (this.rightIris) {
      const x = rightEye.x + rightOffset.x;
      const y = rightEye.y + rightOffset.y;
      this.rightIris.update({
        x: x - irisRadius,
        y: y - irisRadius,
        x2: x + irisRadius,
        y2: y + irisRadius,
      });
    }

    // Update right pupil position
    if (this.rightPupil) {
      const x = rightEye.x + rightOffset.x;
      const y = rightEye.y + rightOffset.y;
      this.rightPupil.update({
        x: x - pupilRadius,
        y: y - pupilRadius,
        x2: x + pupilRadius,
        y2: y + pupilRadius,
      });
    }

    // Update right highlight position
    if (this.rightHighlight) {
      const x = rightEye.x + rightOffset.x - pupilRadius * 0.3;
      const y = rightEye.y + rightOffset.y - pupilRadius * 0.3;
      this.rightHighlight.update({
        x: x - highlightRadius,
        y: y - highlightRadius,
        x2: x + highlightRadius,
        y2: y + highlightRadius,
      });
    }
  }

  cleanup(): void {
    this.stopAnimation();
  }

  buildUI(win: Window): void {
    this.win = win;

    const leftEye = this.eyes.getLeftEye();
    const rightEye = this.eyes.getRightEye();
    const irisRadius = this.eyes.getIrisRadius(leftEye.radius);
    const pupilRadius = this.eyes.getPupilRadius(irisRadius);
    const highlightRadius = this.eyes.getHighlightRadius(pupilRadius);

    this.a.vbox(() => {
      this.a.center(() => {
        this.a.stack(() => {
          // Background rectangle for sizing
          this.a.canvasRectangle({
            width: this.canvasWidth,
            height: this.canvasHeight,
            fillColor: '#87CEEB', // Sky blue background
          });

          // Left eye sclera (white part)
          this.leftSclera = this.a.canvasCircle({
            x: leftEye.x - leftEye.radius,
            y: leftEye.y - leftEye.radius,
            x2: leftEye.x + leftEye.radius,
            y2: leftEye.y + leftEye.radius,
            fillColor: SCLERA_COLOR,
            strokeColor: '#333333',
            strokeWidth: 2,
          });

          // Left eye iris
          this.leftIris = this.a.canvasCircle({
            x: leftEye.x - irisRadius,
            y: leftEye.y - irisRadius,
            x2: leftEye.x + irisRadius,
            y2: leftEye.y + irisRadius,
            fillColor: IRIS_COLOR,
            strokeColor: '#2E7D32',
            strokeWidth: 1,
          });

          // Left eye pupil
          this.leftPupil = this.a.canvasCircle({
            x: leftEye.x - pupilRadius,
            y: leftEye.y - pupilRadius,
            x2: leftEye.x + pupilRadius,
            y2: leftEye.y + pupilRadius,
            fillColor: PUPIL_COLOR,
          });

          // Left eye highlight
          this.leftHighlight = this.a.canvasCircle({
            x: leftEye.x - pupilRadius * 0.3 - highlightRadius,
            y: leftEye.y - pupilRadius * 0.3 - highlightRadius,
            x2: leftEye.x - pupilRadius * 0.3 + highlightRadius,
            y2: leftEye.y - pupilRadius * 0.3 + highlightRadius,
            fillColor: HIGHLIGHT_COLOR,
          });

          // Right eye sclera (white part)
          this.rightSclera = this.a.canvasCircle({
            x: rightEye.x - rightEye.radius,
            y: rightEye.y - rightEye.radius,
            x2: rightEye.x + rightEye.radius,
            y2: rightEye.y + rightEye.radius,
            fillColor: SCLERA_COLOR,
            strokeColor: '#333333',
            strokeWidth: 2,
          });

          // Right eye iris
          this.rightIris = this.a.canvasCircle({
            x: rightEye.x - irisRadius,
            y: rightEye.y - irisRadius,
            x2: rightEye.x + irisRadius,
            y2: rightEye.y + irisRadius,
            fillColor: IRIS_COLOR,
            strokeColor: '#2E7D32',
            strokeWidth: 1,
          });

          // Right eye pupil
          this.rightPupil = this.a.canvasCircle({
            x: rightEye.x - pupilRadius,
            y: rightEye.y - pupilRadius,
            x2: rightEye.x + pupilRadius,
            y2: rightEye.y + pupilRadius,
            fillColor: PUPIL_COLOR,
          });

          // Right eye highlight
          this.rightHighlight = this.a.canvasCircle({
            x: rightEye.x - pupilRadius * 0.3 - highlightRadius,
            y: rightEye.y - pupilRadius * 0.3 - highlightRadius,
            x2: rightEye.x - pupilRadius * 0.3 + highlightRadius,
            y2: rightEye.y - pupilRadius * 0.3 + highlightRadius,
            fillColor: HIGHLIGHT_COLOR,
          });
        });
      });

      this.a.separator();

      this.a.label('Eyes follow a circular path (simulated mouse movement)');
    });

    // Start the animation
    this.startAnimation();
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
