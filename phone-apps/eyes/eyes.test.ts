/**
 * Eyes Tests
 */

import { TsyneTest } from '../../core/src/index-test';
import { createEyesApp, Eyes } from './eyes';

describe('Eyes Logic', () => {
  let eyes: Eyes;

  beforeEach(() => {
    eyes = new Eyes(400, 200);
  });

  describe('initialization', () => {
    it('should calculate eye positions correctly', () => {
      const leftEye = eyes.getLeftEye();
      const rightEye = eyes.getRightEye();

      // Left eye should be at 1/4 of width
      expect(leftEye.x).toBe(100);
      // Right eye should be at 3/4 of width
      expect(rightEye.x).toBe(300);
      // Both should be centered vertically
      expect(leftEye.y).toBe(100);
      expect(rightEye.y).toBe(100);
    });

    it('should have equal eye radii', () => {
      const leftEye = eyes.getLeftEye();
      const rightEye = eyes.getRightEye();
      expect(leftEye.radius).toBe(rightEye.radius);
    });

    it('should start with iris offset at center', () => {
      const leftOffset = eyes.getLeftIrisOffset();
      const rightOffset = eyes.getRightIrisOffset();

      expect(leftOffset.x).toBe(0);
      expect(leftOffset.y).toBe(0);
      expect(rightOffset.x).toBe(0);
      expect(rightOffset.y).toBe(0);
    });
  });

  describe('mouse tracking', () => {
    it('should update iris position when mouse moves', () => {
      // Move mouse to the right
      eyes.setMousePosition(500, 100);

      const leftOffset = eyes.getLeftIrisOffset();
      const rightOffset = eyes.getRightIrisOffset();

      // Both eyes should look right (positive x offset)
      expect(leftOffset.x).toBeGreaterThan(0);
      expect(rightOffset.x).toBeGreaterThan(0);
    });

    it('should update iris position when mouse moves up', () => {
      // Move mouse up
      eyes.setMousePosition(200, 0);

      const leftOffset = eyes.getLeftIrisOffset();

      // Eye should look up (negative y offset)
      expect(leftOffset.y).toBeLessThan(0);
    });

    it('should update iris position when mouse moves down', () => {
      // Move mouse down
      eyes.setMousePosition(200, 300);

      const leftOffset = eyes.getLeftIrisOffset();

      // Eye should look down (positive y offset)
      expect(leftOffset.y).toBeGreaterThan(0);
    });

    it('should limit iris offset to stay within eye', () => {
      const leftEye = eyes.getLeftEye();
      const maxOffset = leftEye.radius * (1 - 0.4); // 0.4 is IRIS_SCALE

      // Move mouse very far away
      eyes.setMousePosition(10000, 100);

      const leftOffset = eyes.getLeftIrisOffset();

      // Offset should be limited
      expect(Math.abs(leftOffset.x)).toBeLessThanOrEqual(maxOffset);
      expect(Math.abs(leftOffset.y)).toBeLessThanOrEqual(maxOffset);
    });
  });

  describe('dimensions', () => {
    it('should update eye positions when dimensions change', () => {
      const originalLeft = eyes.getLeftEye();

      eyes.setDimensions(800, 400);

      const newLeft = eyes.getLeftEye();

      // Left eye x position should change
      expect(newLeft.x).not.toBe(originalLeft.x);
      expect(newLeft.x).toBe(200); // 800 / 4
    });
  });

  describe('radius calculations', () => {
    it('should calculate iris radius correctly', () => {
      const leftEye = eyes.getLeftEye();
      const irisRadius = eyes.getIrisRadius(leftEye.radius);

      // Iris should be 40% of eye radius
      expect(irisRadius).toBeCloseTo(leftEye.radius * 0.4);
    });

    it('should calculate pupil radius correctly', () => {
      const leftEye = eyes.getLeftEye();
      const irisRadius = eyes.getIrisRadius(leftEye.radius);
      const pupilRadius = eyes.getPupilRadius(irisRadius);

      // Pupil should be 50% of iris radius
      expect(pupilRadius).toBeCloseTo(irisRadius * 0.5);
    });

    it('should calculate highlight radius correctly', () => {
      const leftEye = eyes.getLeftEye();
      const irisRadius = eyes.getIrisRadius(leftEye.radius);
      const pupilRadius = eyes.getPupilRadius(irisRadius);
      const highlightRadius = eyes.getHighlightRadius(pupilRadius);

      // Highlight should be 20% of pupil radius
      expect(highlightRadius).toBeCloseTo(pupilRadius * 0.2);
    });
  });
});

describe('Eyes UI', () => {
  let tsyneTest: TsyneTest;

  beforeAll(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should create the eyes app', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createEyesApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // The app should render without errors
    // Canvas elements don't have IDs in the current implementation
    // so we just verify the app starts
  }, 30000);
});
