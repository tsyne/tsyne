/**
 * Lifecycle Load Test
 *
 * Tests the robustness of Tsyne's lifecycle management under concurrent load:
 * - stdio bridge establishment
 * - gRPC handoff
 * - Fyne UI creation and destruction
 * - Resource cleanup in correct order
 * - No unexpected exceptions in Go or TypeScript
 *
 * Runs multiple instances in parallel to stress test resource management.
 */

import { TsyneTest, TestContext } from './index-test';

// Type augmentation for Node.js internal methods
declare global {
  interface Process {
    _getActiveHandles?(): unknown[];
    _getActiveRequests?(): unknown[];
  }
}

interface LifecycleEvent {
  timestamp: number;
  phase: 'bridge_start' | 'bridge_ready' | 'grpc_ready' | 'app_run' | 'cleanup_start' | 'cleanup_complete';
  instanceId: number;
}

interface LifecycleError {
  timestamp: number;
  phase: string;
  instanceId: number;
  error: Error;
  isExpected: boolean;
}

interface MessageStats {
  stdioSent: number;
  stdioReceived: number;
  grpcSent: number;
  grpcReceived: number;
}

interface LoadTestResult {
  instanceId: number;
  duration: number;
  events: LifecycleEvent[];
  errors: LifecycleError[];
  messageStats: MessageStats;
  success: boolean;
}

class LifecycleInstrumentation {
  private events: LifecycleEvent[] = [];
  private errors: LifecycleError[] = [];
  private messageStats: Map<number, MessageStats> = new Map();
  private startTime: number = Date.now();
  private lock: Promise<void> = Promise.resolve();

  // ACID-compliant atomic update
  private async atomic<T>(operation: () => T): Promise<T> {
    const prevLock = this.lock;
    let resolveLock: () => void;
    this.lock = new Promise(resolve => { resolveLock = resolve; });

    await prevLock;
    try {
      return operation();
    } finally {
      resolveLock!();
    }
  }

  async recordEvent(phase: LifecycleEvent['phase'], instanceId: number) {
    await this.atomic(() => {
      this.events.push({
        timestamp: Date.now() - this.startTime,
        phase,
        instanceId
      });
    });
  }

  async recordError(phase: string, instanceId: number, error: Error, isExpected: boolean = false) {
    await this.atomic(() => {
      this.errors.push({
        timestamp: Date.now() - this.startTime,
        phase,
        instanceId,
        error,
        isExpected
      });
    });
  }

  async recordMessageStats(instanceId: number, stats: MessageStats) {
    await this.atomic(() => {
      this.messageStats.set(instanceId, stats);
    });
  }

  getEvents(): LifecycleEvent[] {
    return [...this.events];
  }

  getErrors(): LifecycleError[] {
    return [...this.errors];
  }

  getMessageStats(): Map<number, MessageStats> {
    return new Map(this.messageStats);
  }

  validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const events = this.getEvents();
    const errors = this.getErrors();

    // Check for unexpected errors
    const unexpectedErrors = errors.filter(e => !e.isExpected);
    if (unexpectedErrors.length > 0) {
      issues.push(`Found ${unexpectedErrors.length} unexpected errors`);
      unexpectedErrors.forEach(e => {
        issues.push(`  Instance ${e.instanceId} in ${e.phase}: ${e.error.message}`);
      });
    }

    // Check lifecycle order for each instance
    const instanceEvents = new Map<number, LifecycleEvent[]>();
    for (const event of events) {
      if (!instanceEvents.has(event.instanceId)) {
        instanceEvents.set(event.instanceId, []);
      }
      instanceEvents.get(event.instanceId)!.push(event);
    }

    for (const [instanceId, events] of instanceEvents) {
      const phases = events.map(e => e.phase);

      // Expected order: bridge_start -> bridge_ready -> app_run -> cleanup_start -> cleanup_complete
      const expectedOrder: LifecycleEvent['phase'][] = [
        'bridge_start',
        'bridge_ready',
        'app_run',
        'cleanup_start',
        'cleanup_complete'
      ];

      let lastIndex = -1;
      for (const phase of phases) {
        const currentIndex = expectedOrder.indexOf(phase);
        if (currentIndex < lastIndex) {
          issues.push(`Instance ${instanceId}: Phase '${phase}' occurred out of order`);
        }
        lastIndex = currentIndex;
      }

      // Check for missing phases
      const missingPhases = expectedOrder.filter(p => !phases.includes(p));
      if (missingPhases.length > 0) {
        issues.push(`Instance ${instanceId}: Missing phases: ${missingPhases.join(', ')}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  generateReport(): string {
    const validation = this.validate();
    const events = this.getEvents();
    const errors = this.getErrors();
    const messageStats = this.getMessageStats();
    const lines: string[] = [];

    lines.push('=== Lifecycle Load Test Report ===');
    lines.push('');
    lines.push(`Total events: ${events.length}`);
    lines.push(`Total errors: ${errors.length} (${errors.filter(e => !e.isExpected).length} unexpected)`);
    lines.push('');

    if (validation.valid) {
      lines.push('✓ All lifecycle events occurred in correct order');
      lines.push('✓ No unexpected exceptions');
    } else {
      lines.push('✗ Validation failed:');
      validation.issues.forEach(issue => lines.push(`  ${issue}`));
    }

    // Message stats summary
    if (messageStats.size > 0) {
      lines.push('');
      lines.push('Message Statistics:');
      let totalStdioSent = 0, totalStdioReceived = 0;
      let totalGrpcSent = 0, totalGrpcReceived = 0;

      for (const [instanceId, stats] of messageStats) {
        lines.push(`  Instance ${instanceId}:`);
        lines.push(`    stdio:  sent=${stats.stdioSent.toString().padStart(4)}  received=${stats.stdioReceived.toString().padStart(4)}`);
        lines.push(`    gRPC:   sent=${stats.grpcSent.toString().padStart(4)}  received=${stats.grpcReceived.toString().padStart(4)}`);

        totalStdioSent += stats.stdioSent;
        totalStdioReceived += stats.stdioReceived;
        totalGrpcSent += stats.grpcSent;
        totalGrpcReceived += stats.grpcReceived;
      }

      lines.push('');
      lines.push('  Totals across all instances:');
      lines.push(`    stdio:  sent=${totalStdioSent.toString().padStart(4)}  received=${totalStdioReceived.toString().padStart(4)}`);
      lines.push(`    gRPC:   sent=${totalGrpcSent.toString().padStart(4)}  received=${totalGrpcReceived.toString().padStart(4)}`);
    }

    lines.push('');
    lines.push('Event timeline:');

    // Group events by instance
    const instanceEvents = new Map<number, LifecycleEvent[]>();
    for (const event of events) {
      if (!instanceEvents.has(event.instanceId)) {
        instanceEvents.set(event.instanceId, []);
      }
      instanceEvents.get(event.instanceId)!.push(event);
    }

    for (const [instanceId, evts] of instanceEvents) {
      lines.push(`  Instance ${instanceId}:`);
      for (const event of evts) {
        lines.push(`    ${event.timestamp.toString().padStart(6)}ms  ${event.phase}`);
      }
    }

    if (errors.length > 0) {
      lines.push('');
      lines.push('Errors:');
      for (const error of errors) {
        const marker = error.isExpected ? '✓' : '✗';
        lines.push(`  ${marker} Instance ${error.instanceId} @ ${error.timestamp}ms in ${error.phase}:`);
        lines.push(`    ${error.error.message}`);
        if (error.error.stack) {
          const stackLines = error.error.stack.split('\n').slice(1, 3);
          stackLines.forEach(line => lines.push(`    ${line.trim()}`));
        }
      }
    }

    return lines.join('\n');
  }
}

async function runSingleInstance(instanceId: number, instrumentation: LifecycleInstrumentation, bridgeMode: 'stdio' | 'grpc' | 'msgpack-uds' = 'stdio'): Promise<LoadTestResult> {
  const startTime = Date.now();
  const events: LifecycleEvent[] = [];
  const errors: LifecycleError[] = [];
  const messageStats: MessageStats = {
    stdioSent: 0,
    stdioReceived: 0,
    grpcSent: 0,
    grpcReceived: 0
  };
  let success = false;

  try {
    // Phase 1: Bridge Start
// console.log(`[Instance ${instanceId}] Phase 1: Starting bridge (${bridgeMode})...`);
    await instrumentation.recordEvent('bridge_start', instanceId);
    const tsyneTest = new TsyneTest({ headed: false, bridgeMode });
// console.log(`[Instance ${instanceId}] TsyneTest created`);

    // Phase 2 & 3: Bridge Ready + App Creation
    let windowRef: any;
// console.log(`[Instance ${instanceId}] Phase 2: Creating app...`);
    const testApp = await tsyneTest.createApp((app) => {
      // Intercept bridge to count messages
      const bridge = app.getBridge() as any;
      if (bridge) {
        const originalSend = bridge.send.bind(bridge);
        bridge.send = async function(...args: any[]) {
          // Track by bridge type (stdio vs grpc)
          if (bridgeMode === 'grpc') {
            messageStats.grpcSent++;
            const result = await originalSend(...args);
            messageStats.grpcReceived++;
            return result;
          } else {
            messageStats.stdioSent++;
            const result = await originalSend(...args);
            messageStats.stdioReceived++;
            return result;
          }
        };
      }

// console.log(`[Instance ${instanceId}] Bridge ready, creating window...`);
      instrumentation.recordEvent('bridge_ready', instanceId);

      // Create window with button - use sync builder, show after run
      let buttonWidget: any;
      app.window({ title: `Load Test ${instanceId}`, width: 400, height: 300 }, (win) => {
        windowRef = win;
        // Sync content creation - widgets are collected by constructor
        buttonWidget = app.button(`Button ${instanceId}`, () => {
          // Button click handler
        });
      });
// console.log(`[Instance ${instanceId}] Window and widgets created`);
    });

// console.log(`[Instance ${instanceId}] App created, getting context...`);
    const ctx = tsyneTest.getContext();
// console.log(`[Instance ${instanceId}] Phase 3: Running app (this calls win.show() and waitForRegistrations())...`);
    await testApp.run();
// console.log(`[Instance ${instanceId}] ✓ app.run() completed!`);

    // Show window after run (when creation is complete)
    if (windowRef) {
// console.log(`[Instance ${instanceId}] Showing window...`);
      await windowRef.show();
// console.log(`[Instance ${instanceId}] Window shown`);
    }
    await instrumentation.recordEvent('app_run', instanceId);

    // Verify button is visible
// console.log(`[Instance ${instanceId}] Verifying button is visible...`);
    await ctx.expect(ctx.getByText(`Button ${instanceId}`)).toBeVisible();
// console.log(`[Instance ${instanceId}] ✓ Button verified`);

    // Phase 4: Cleanup Start
// console.log(`[Instance ${instanceId}] Phase 4: Starting cleanup...`);
    await instrumentation.recordEvent('cleanup_start', instanceId);
    await tsyneTest.cleanup();
// console.log(`[Instance ${instanceId}] ✓ Cleanup complete`);
    await instrumentation.recordEvent('cleanup_complete', instanceId);

    // Record message stats
    await instrumentation.recordMessageStats(instanceId, messageStats);

// console.log(`[Instance ${instanceId}] ✓✓✓ SUCCESS - Total duration: ${Date.now() - startTime}ms`);
    success = true;
  } catch (error) {
    const err = error as Error;
    console.error(`[Instance ${instanceId}] ✗✗✗ ERROR at ${Date.now() - startTime}ms: ${err.message}`);
    console.error(`[Instance ${instanceId}] Stack: ${err.stack?.split('\n').slice(0, 3).join('\n')}`);
    await instrumentation.recordError('unknown', instanceId, err, false);
    errors.push({
      timestamp: Date.now() - startTime,
      phase: 'unknown',
      instanceId,
      error: err,
      isExpected: false
    });
  }

  return {
    instanceId,
    duration: Date.now() - startTime,
    events,
    errors,
    messageStats,
    success
  };
}

describe('Lifecycle Load Tests', () => {
  test('should handle rapid create/destroy cycles without errors (stdio mode)', async () => {
    const CONCURRENT_INSTANCES = 5;
    const instrumentation = new LifecycleInstrumentation();

// console.log(`\n========================================`);
// console.log(`Starting ${CONCURRENT_INSTANCES} concurrent instances (stdio mode)`);
// console.log(`========================================\n`);

    // Run instances in parallel
    const promises = Array.from({ length: CONCURRENT_INSTANCES }, (_, i) =>
      runSingleInstance(i, instrumentation, 'stdio')
    );

// console.log(`All ${CONCURRENT_INSTANCES} instances launched, waiting for completion...`);
    const results = await Promise.all(promises);
// console.log(`\n✓ All instances completed!\n`);

    // Generate and print report
    const report = instrumentation.generateReport();
// console.log(report);

    // Validate results
    const validation = instrumentation.validate();

    // Assert no unexpected errors
    const unexpectedErrors = instrumentation.getErrors().filter(e => !e.isExpected);
    if (unexpectedErrors.length > 0) {
      console.error('Unexpected errors found:');
      unexpectedErrors.forEach(e => {
        console.error(`  Instance ${e.instanceId}: ${e.error.message}`);
      });
    }
    expect(unexpectedErrors.length).toBe(0);

    // Assert all instances succeeded
    const failedInstances = results.filter(r => !r.success);
    if (failedInstances.length > 0) {
      console.error('Failed instances:', failedInstances.map(r => r.instanceId));
    }
    expect(failedInstances.length).toBe(0);

    // Assert lifecycle order is correct
    expect(validation.valid).toBe(true);
    if (!validation.valid) {
      console.error('Validation issues:', validation.issues);
    }

    // Print performance stats
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const maxDuration = Math.max(...results.map(r => r.duration));
    const minDuration = Math.min(...results.map(r => r.duration));

// console.log('\nPerformance stats:');
// console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
// console.log(`  Min duration: ${minDuration}ms`);
// console.log(`  Max duration: ${maxDuration}ms`);
// console.log(`  Total events: ${instrumentation.getEvents().length}`);
  }, 60000); // 60 second timeout

  test('should handle rapid create/destroy cycles without errors (gRPC mode)', async () => {
    const CONCURRENT_INSTANCES = 5;
    const instrumentation = new LifecycleInstrumentation();

    // Run instances in parallel
    const promises = Array.from({ length: CONCURRENT_INSTANCES }, (_, i) =>
      runSingleInstance(i, instrumentation, 'grpc')
    );

    const results = await Promise.all(promises);

    // Generate and print report
    const report = instrumentation.generateReport();
// console.log(report);

    // Validate results
    const validation = instrumentation.validate();

    // Assert no unexpected errors
    const unexpectedErrors = instrumentation.getErrors().filter(e => !e.isExpected);
    if (unexpectedErrors.length > 0) {
      console.error('Unexpected errors found:');
      unexpectedErrors.forEach(e => {
        console.error(`  Instance ${e.instanceId}: ${e.error.message}`);
      });
    }
    expect(unexpectedErrors.length).toBe(0);

    // Assert all instances succeeded
    const failedInstances = results.filter(r => !r.success);
    if (failedInstances.length > 0) {
      console.error('Failed instances:', failedInstances.map(r => r.instanceId));
    }
    expect(failedInstances.length).toBe(0);

    // Assert lifecycle order is correct
    expect(validation.valid).toBe(true);
    if (!validation.valid) {
      console.error('Validation issues:', validation.issues);
    }

    // Print performance stats
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const maxDuration = Math.max(...results.map(r => r.duration));
    const minDuration = Math.min(...results.map(r => r.duration));

// console.log('\nPerformance stats:');
// console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
// console.log(`  Min duration: ${minDuration}ms`);
// console.log(`  Max duration: ${maxDuration}ms`);
// console.log(`  Total events: ${instrumentation.getEvents().length}`);
  }, 60000); // 60 second timeout

  test('should handle sequential rapid cycles', async () => {
    const SEQUENTIAL_RUNS = 10;
    const instrumentation = new LifecycleInstrumentation();

    for (let i = 0; i < SEQUENTIAL_RUNS; i++) {
      await runSingleInstance(i, instrumentation, 'stdio');

      // Small delay between runs to simulate real usage
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const report = instrumentation.generateReport();
// console.log(report);

    const validation = instrumentation.validate();
    const unexpectedErrors = instrumentation.getErrors().filter(e => !e.isExpected);

    expect(unexpectedErrors.length).toBe(0);
    expect(validation.valid).toBe(true);

// console.log(`\n✓ Successfully completed ${SEQUENTIAL_RUNS} sequential runs`);
  }, 60000);

  test('should detect resource leaks (stdio mode)', async () => {
    const INSTANCES = 3;
    const instrumentation = new LifecycleInstrumentation();

    // Track process handles before and after
    const initialHandles = (process as any)._getActiveHandles?.()?.length ?? 0;
    const initialRequests = (process as any)._getActiveRequests?.()?.length ?? 0;

    // Run instances
    const promises = Array.from({ length: INSTANCES }, (_, i) =>
      runSingleInstance(i, instrumentation, 'stdio')
    );
    await Promise.all(promises);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));

    const finalHandles = (process as any)._getActiveHandles?.()?.length ?? 0;
    const finalRequests = (process as any)._getActiveRequests?.()?.length ?? 0;

    const handleDelta = finalHandles - initialHandles;
    const requestDelta = finalRequests - initialRequests;

// console.log(`\nResource check:`);
// console.log(`  Active handles: ${initialHandles} -> ${finalHandles} (delta: ${handleDelta})`);
// console.log(`  Active requests: ${initialRequests} -> ${finalRequests} (delta: ${requestDelta})`);

    // Allow some tolerance for background Node.js activity
    // But flag significant increases as potential leaks
    if (handleDelta > 10 || requestDelta > 10) {
      console.warn('⚠️  Potential resource leak detected');
      console.warn(`  Handle increase: ${handleDelta}`);
      console.warn(`  Request increase: ${requestDelta}`);
    } else {
// console.log('✓ No significant resource leaks detected');
    }

    // Still validate lifecycle was correct
    const validation = instrumentation.validate();
    expect(validation.valid).toBe(true);
  }, 60000);

  test('should detect resource leaks (gRPC mode)', async () => {
    const INSTANCES = 3;
    const instrumentation = new LifecycleInstrumentation();

    // Track process handles before and after
    const initialHandles = (process as any)._getActiveHandles?.()?.length ?? 0;
    const initialRequests = (process as any)._getActiveRequests?.()?.length ?? 0;

    // Run instances
    const promises = Array.from({ length: INSTANCES }, (_, i) =>
      runSingleInstance(i, instrumentation, 'grpc')
    );
    await Promise.all(promises);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));

    const finalHandles = (process as any)._getActiveHandles?.()?.length ?? 0;
    const finalRequests = (process as any)._getActiveRequests?.()?.length ?? 0;

    const handleDelta = finalHandles - initialHandles;
    const requestDelta = finalRequests - initialRequests;

// console.log(`\nResource check:`);
// console.log(`  Active handles: ${initialHandles} -> ${finalHandles} (delta: ${handleDelta})`);
// console.log(`  Active requests: ${initialRequests} -> ${finalRequests} (delta: ${requestDelta})`);

    // Allow some tolerance for background Node.js activity
    // But flag significant increases as potential leaks
    if (handleDelta > 10 || requestDelta > 10) {
      console.warn('⚠️  Potential resource leak detected');
      console.warn(`  Handle increase: ${handleDelta}`);
      console.warn(`  Request increase: ${requestDelta}`);
    } else {
// console.log('✓ No significant resource leaks detected');
    }

    // Still validate lifecycle was correct
    const validation = instrumentation.validate();
    expect(validation.valid).toBe(true);
  }, 60000);
});
