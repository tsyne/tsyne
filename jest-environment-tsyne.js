const NodeEnvironment = require('jest-environment-node').default;

class TsyneEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    this.global.tsyne = {
      __setGlobalContext: (context) => {
        this.global.tsyne = { ...this.global.tsyne, ...context };
      },
    };

    // Suppress "Bridge shutting down" errors during test cleanup
    // These are expected errors that occur when tests end while bridge requests are pending
    this.unhandledRejectionHandler = (reason) => {
      if (reason && reason.message && reason.message.includes('Bridge') && reason.message.includes('shutting down')) {
        // Silently ignore - this is an expected cleanup error
        return;
      }
      // For other errors, log them so they don't go unnoticed
      console.error('Unhandled promise rejection:', reason);
    };

    this.global.process.on('unhandledRejection', this.unhandledRejectionHandler);
  }

  async teardown() {
    if (this.unhandledRejectionHandler) {
      this.global.process.removeListener('unhandledRejection', this.unhandledRejectionHandler);
    }

    // Print wait time report at the end of this test file's execution
    // Access the global singleton tracker that's shared with test files
    const TRACKER_KEY = '__tsyneWaitTimeTracker';
    const waitTimeTracker = this.global[TRACKER_KEY];
    if (waitTimeTracker && waitTimeTracker.getTotalWaitTime && waitTimeTracker.getTotalWaitTime() > 0) {
      waitTimeTracker.printReport();
      // Clear for next test file (each file gets its own environment)
      waitTimeTracker.clear();
    }

    await super.teardown();
  }
}

module.exports = TsyneEnvironment;
