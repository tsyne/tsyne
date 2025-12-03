/**
 * Tracks headless screenshots and reports a summary at the end of the test run
 *
 * Instead of printing a warning on every screenshot call, this module
 * collects all headless screenshot events and prints a single summary
 * when the process exits.
 */

let headlessScreenshotCount = 0;
let exitHandlerRegistered = false;

/**
 * Record that a headless screenshot was taken.
 * The warning will be printed once at process exit.
 */
export function recordHeadlessScreenshot(): void {
  headlessScreenshotCount++;

  // Register exit handler on first call
  if (!exitHandlerRegistered) {
    exitHandlerRegistered = true;
    process.on('exit', printHeadlessScreenshotSummary);
  }
}

/**
 * Get the current count of headless screenshots taken
 */
export function getHeadlessScreenshotCount(): number {
  return headlessScreenshotCount;
}

/**
 * Reset the counter (useful for testing)
 */
export function resetHeadlessScreenshotCount(): void {
  headlessScreenshotCount = 0;
}

/**
 * Print the summary of headless screenshots (called on process exit)
 */
function printHeadlessScreenshotSummary(): void {
  if (headlessScreenshotCount > 0) {
    const plural = headlessScreenshotCount === 1 ? '' : 's';
    console.warn(`\n  ⚠️  ${headlessScreenshotCount} screenshot${plural} captured in headless mode - will be blank/grey`);
    console.warn('     For visual screenshots, use headed mode: new TsyneTest({ headed: true })');
  }
}
