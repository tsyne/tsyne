/**
 * Unit tests for drop zone detection logic
 * These tests expose bugs in the drag/drop coordinate calculations
 */

import { detectDropZone, DropZoneType } from './drop-zone';

describe('Drop Zone Detection', () => {
  describe('Foundation Zone Detection (1000px window)', () => {
    test('should detect foundation 0 (left)', () => {
      // Foundation 0: x from 0 to 249
      // Center: x=125, y=190 (middle of foundation area)
      const result = detectDropZone(125, 190, 1000, 700);
      expect(result.zone).toBe('foundation');
      expect(result.index).toBe(0);
    });

    test('should detect foundation 1', () => {
      // Foundation 1: x from 250 to 499
      // Center: x=375
      const result = detectDropZone(375, 190, 1000, 700);
      expect(result.zone).toBe('foundation');
      expect(result.index).toBe(1);
    });

    test('should detect foundation 2', () => {
      // Foundation 2: x from 500 to 749
      // Center: x=625
      const result = detectDropZone(625, 190, 1000, 700);
      expect(result.zone).toBe('foundation');
      expect(result.index).toBe(2);
    });

    test('should detect foundation 3 (right)', () => {
      // Foundation 3: x from 750 to 999
      // Center: x=875
      const result = detectDropZone(875, 190, 1000, 700);
      expect(result.zone).toBe('foundation');
      expect(result.index).toBe(3);
    });

    test('should detect foundation at boundary y=140', () => {
      const result = detectDropZone(125, 140, 1000, 700);
      expect(result.zone).toBe('foundation');
      expect(result.index).toBe(0);
    });

    test('should detect foundation at boundary y=239', () => {
      const result = detectDropZone(125, 239, 1000, 700);
      expect(result.zone).toBe('foundation');
      expect(result.index).toBe(0);
    });

    test('should NOT detect foundation at y=139 (too high)', () => {
      const result = detectDropZone(125, 139, 1000, 700);
      expect(result.zone).toBe('invalid');
    });

    test('should NOT detect foundation at y=240 (tableau starts)', () => {
      const result = detectDropZone(125, 240, 1000, 700);
      expect(result.zone).toBe('tableau');
    });
  });

  describe('Tableau Zone Detection (1000px window)', () => {
    test('should detect tableau stack 0 (leftmost)', () => {
      // Stack 0: x from 0 to ~142
      // Center: x=71
      const result = detectDropZone(71, 300, 1000, 700);
      expect(result.zone).toBe('tableau');
      expect(result.index).toBe(0);
    });

    test('should detect tableau stack 1', () => {
      // Stack 1: x from ~143 to ~285
      // Center: x=214
      const result = detectDropZone(214, 300, 1000, 700);
      expect(result.zone).toBe('tableau');
      expect(result.index).toBe(1);
    });

    test('should detect tableau stack 2', () => {
      // Stack 2: x from ~286 to ~428
      // Center: x=357
      const result = detectDropZone(357, 300, 1000, 700);
      expect(result.zone).toBe('tableau');
      expect(result.index).toBe(2);
    });

    test('should detect tableau stack 3 (middle)', () => {
      // Stack 3: x from ~429 to ~571
      // Center: x=500
      const result = detectDropZone(500, 300, 1000, 700);
      expect(result.zone).toBe('tableau');
      expect(result.index).toBe(3);
    });

    test('should detect tableau stack 4', () => {
      // Stack 4: x from ~572 to ~714
      // Center: x=643
      const result = detectDropZone(643, 300, 1000, 700);
      expect(result.zone).toBe('tableau');
      expect(result.index).toBe(4);
    });

    test('should detect tableau stack 5', () => {
      // Stack 5: x from ~715 to ~857
      // Center: x=786
      const result = detectDropZone(786, 300, 1000, 700);
      expect(result.zone).toBe('tableau');
      expect(result.index).toBe(5);
    });

    test('should detect tableau stack 6 (rightmost)', () => {
      // Stack 6: x from ~858 to 999
      // Center: x=929
      const result = detectDropZone(929, 300, 1000, 700);
      expect(result.zone).toBe('tableau');
      expect(result.index).toBe(6);
    });

    test('should detect tableau at boundary y=240', () => {
      const result = detectDropZone(71, 240, 1000, 700);
      expect(result.zone).toBe('tableau');
      expect(result.index).toBe(0);
    });

    test('should detect tableau at y=699 (bottom of window)', () => {
      const result = detectDropZone(71, 699, 1000, 700);
      expect(result.zone).toBe('tableau');
      expect(result.index).toBe(0);
    });
  });

  describe('Invalid Drop Zones', () => {
    test('should reject drop in toolbar area (y < 140)', () => {
      const result = detectDropZone(500, 50, 1000, 700);
      expect(result.zone).toBe('invalid');
      expect(result.index).toBe(-1);
    });

    test('should reject drop at y=0 (top edge)', () => {
      const result = detectDropZone(500, 0, 1000, 700);
      expect(result.zone).toBe('invalid');
      expect(result.index).toBe(-1);
    });

    test('should reject drop at negative x', () => {
      const result = detectDropZone(-10, 300, 1000, 700);
      expect(result.zone).toBe('invalid');
      expect(result.index).toBe(-1);
    });

    test('should reject drop beyond window width', () => {
      const result = detectDropZone(1001, 300, 1000, 700);
      expect(result.zone).toBe('invalid');
      expect(result.index).toBe(-1);
    });
  });

  describe('OLD BUGGY Logic (500px assumptions)', () => {
    // These tests demonstrate the BUG in the original implementation
    // The original code assumed a 500px window but the actual window is 1000px

    test('BUG: Original code would detect wrong foundation with 500px math', () => {
      // If we drop at x=125 (center of foundation 0 in 1000px window)
      // Original buggy code: Math.floor(125 / 125) = 1 (WRONG!)
      // Correct code: Math.floor(125 / 250) = 0 (CORRECT)

      const buggyIndex = Math.floor(125 / 125); // Original calculation
      const correctResult = detectDropZone(125, 190, 1000, 700);

      expect(buggyIndex).toBe(1); // Bug: detects foundation 1
      expect(correctResult.index).toBe(0); // Correct: foundation 0
    });

    test('BUG: Original code would detect wrong tableau with 500px math', () => {
      // If we drop at x=71 (center of stack 0 in 1000px window)
      // Original buggy code: Math.floor(71 / 71) = 1 (WRONG!)
      // Correct code: Math.floor(71 / 142.857) = 0 (CORRECT)

      const buggyIndex = Math.floor(71 / 71); // Original calculation
      const correctResult = detectDropZone(71, 300, 1000, 700);

      expect(buggyIndex).toBe(1); // Bug: detects stack 1
      expect(correctResult.index).toBe(0); // Correct: stack 0
    });

    test('BUG: Original foundation width was 125px (500/4), should be 250px (1000/4)', () => {
      // Foundation 0 should be x: 0-249
      // Foundation 1 should be x: 250-499
      // Boundary at x=250 should detect foundation 1, not 0

      const result = detectDropZone(250, 190, 1000, 700);
      expect(result.zone).toBe('foundation');
      expect(result.index).toBe(1); // Should be foundation 1 at x=250
    });

    test('BUG: Original tableau width was ~71px (500/7), should be ~143px (1000/7)', () => {
      // Stack 0 should be x: 0-142
      // Stack 1 should be x: 143-285
      // Boundary at x=143 should detect stack 1, not 0

      const result = detectDropZone(143, 300, 1000, 700);
      expect(result.zone).toBe('tableau');
      expect(result.index).toBe(1); // Should be stack 1 at x=143
    });
  });

  describe('Edge Cases', () => {
    test('should handle x=0 correctly (leftmost edge)', () => {
      // Foundation area
      const foundationResult = detectDropZone(0, 190, 1000, 700);
      expect(foundationResult.zone).toBe('foundation');
      expect(foundationResult.index).toBe(0);

      // Tableau area
      const tableauResult = detectDropZone(0, 300, 1000, 700);
      expect(tableauResult.zone).toBe('tableau');
      expect(tableauResult.index).toBe(0);
    });

    test('should handle x=999 correctly (rightmost edge)', () => {
      // Foundation area - should be foundation 3
      const foundationResult = detectDropZone(999, 190, 1000, 700);
      expect(foundationResult.zone).toBe('foundation');
      expect(foundationResult.index).toBe(3);

      // Tableau area - should be stack 6
      const tableauResult = detectDropZone(999, 300, 1000, 700);
      expect(tableauResult.zone).toBe('tableau');
      expect(tableauResult.index).toBe(6);
    });

    test('should handle exact boundary between foundations', () => {
      // x=250 is the exact boundary between foundation 0 and 1
      // Math.floor(250 / 250) = 1, so it should be foundation 1
      const result = detectDropZone(250, 190, 1000, 700);
      expect(result.zone).toBe('foundation');
      expect(result.index).toBe(1);
    });

    test('should handle exact boundary between tableau stacks', () => {
      // 1000 / 7 = 142.857...
      // x=143 should be stack 1
      const result = detectDropZone(143, 300, 1000, 700);
      expect(result.zone).toBe('tableau');
      expect(result.index).toBe(1);
    });
  });
});
