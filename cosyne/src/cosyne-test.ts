/**
 * CosyneTest - Testing utilities for Cosyne canvas applications
 *
 * Extends TsyneTest with cosyne-specific testing capabilities.
 */

import { TsyneTest, TestOptions } from 'tsyne';

export interface CosyneTestOptions extends TestOptions {
  // Future: cosyne-specific options
}

/**
 * CosyneTest extends TsyneTest with canvas-specific testing utilities.
 *
 * Usage:
 * ```typescript
 * const test = new CosyneTest({ headed: false });
 * await test.createApp(myAppBuilder);
 * await test.screenshot('/tmp/test.png');
 * ```
 */
export class CosyneTest extends TsyneTest {
  constructor(options?: CosyneTestOptions) {
    super(options);
  }

  // Future: Add cosyne-specific testing methods
  // e.g., primitive inspection, animation testing, hit-testing validation
}
