/**
 * Transport Protocol Latency Benchmark
 *
 * Measures per-message round-trip latency for all four transport protocols.
 * This test creates many small messages to isolate protocol overhead.
 *
 * Transports tested:
 * - stdio: JSON over stdin/stdout with length+CRC framing
 * - grpc: Protocol Buffers over gRPC
 * - msgpack-uds: MessagePack over Unix Domain Sockets
 * - ffi: Direct function calls to Go shared library (requires libtsyne.so)
 */

import { TsyneTest } from './index-test';

interface LatencyResult {
  protocol: 'stdio' | 'grpc' | 'msgpack-uds' | 'ffi';
  messageCount: number;
  totalTimeMs: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  messagesPerSecond: number;
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function measureLatency(
  protocol: 'stdio' | 'grpc' | 'msgpack-uds' | 'ffi',
  messageCount: number
): Promise<LatencyResult> {
  const tsyneTest = new TsyneTest({ headed: false, bridgeMode: protocol });
  const latencies: number[] = [];

  try {
    let windowRef: any;
    const testApp = await tsyneTest.createApp((app) => {
      // Create minimal window with sync builder
      app.window({ title: 'Latency Test', width: 200, height: 100 }, (win) => {
        windowRef = win;
        app.label('Test');
      });
    });

    await testApp.run();
    if (windowRef) {
      await windowRef.show();
    }
    const bridge = testApp.getBridge();

    // Warm-up: 10 messages to prime connections
    for (let i = 0; i < 10; i++) {
      await bridge.send('getText', { widgetId: 'nonexistent' }).catch(() => {});
    }

    // Measure latencies
    const startTotal = performance.now();

    for (let i = 0; i < messageCount; i++) {
      const start = performance.now();
      // Use a lightweight query that requires round-trip
      await bridge.send('getAllWidgets', {});
      const end = performance.now();
      latencies.push(end - start);
    }

    const endTotal = performance.now();
    const totalTimeMs = endTotal - startTotal;

    // Calculate statistics
    const sorted = [...latencies].sort((a, b) => a - b);
    const sum = latencies.reduce((a, b) => a + b, 0);

    return {
      protocol,
      messageCount,
      totalTimeMs,
      avgLatencyMs: sum / messageCount,
      minLatencyMs: sorted[0],
      maxLatencyMs: sorted[sorted.length - 1],
      p50LatencyMs: percentile(sorted, 50),
      p95LatencyMs: percentile(sorted, 95),
      p99LatencyMs: percentile(sorted, 99),
      messagesPerSecond: (messageCount / totalTimeMs) * 1000,
    };
  } finally {
    await tsyneTest.cleanup();
  }
}

function formatResult(result: LatencyResult): string {
  return [
    `\n=== ${result.protocol.toUpperCase()} Protocol Latency ===`,
    `Messages:         ${result.messageCount}`,
    `Total time:       ${result.totalTimeMs.toFixed(2)}ms`,
    `Avg latency:      ${result.avgLatencyMs.toFixed(3)}ms`,
    `Min latency:      ${result.minLatencyMs.toFixed(3)}ms`,
    `Max latency:      ${result.maxLatencyMs.toFixed(3)}ms`,
    `P50 latency:      ${result.p50LatencyMs.toFixed(3)}ms`,
    `P95 latency:      ${result.p95LatencyMs.toFixed(3)}ms`,
    `P99 latency:      ${result.p99LatencyMs.toFixed(3)}ms`,
    `Throughput:       ${result.messagesPerSecond.toFixed(1)} msg/sec`,
  ].join('\n');
}

describe('Protocol Latency Benchmark', () => {
  const MESSAGE_COUNT = 100; // Adjust based on test time constraints

  test('measure stdio latency', async () => {
    const result = await measureLatency('stdio', MESSAGE_COUNT);
    console.log(formatResult(result));

    // Basic sanity check
    expect(result.avgLatencyMs).toBeGreaterThan(0);
    expect(result.avgLatencyMs).toBeLessThan(100); // Should be under 100ms per message
  }, 60000);

  test('measure gRPC latency', async () => {
    const result = await measureLatency('grpc', MESSAGE_COUNT);
    console.log(formatResult(result));

    expect(result.avgLatencyMs).toBeGreaterThan(0);
    expect(result.avgLatencyMs).toBeLessThan(100);
  }, 60000);

  test('measure msgpack-uds latency', async () => {
    const result = await measureLatency('msgpack-uds', MESSAGE_COUNT);
    console.log(formatResult(result));

    expect(result.avgLatencyMs).toBeGreaterThan(0);
    expect(result.avgLatencyMs).toBeLessThan(100);
  }, 60000);

  test('measure ffi latency', async () => {
    const result = await measureLatency('ffi', MESSAGE_COUNT);
    console.log(formatResult(result));

    expect(result.avgLatencyMs).toBeGreaterThan(0);
    expect(result.avgLatencyMs).toBeLessThan(100);
  }, 60000);

  test('compare all protocols latency', async () => {
    // Run all four protocols
    const stdioResult = await measureLatency('stdio', MESSAGE_COUNT);
    const grpcResult = await measureLatency('grpc', MESSAGE_COUNT);
    const msgpackResult = await measureLatency('msgpack-uds', MESSAGE_COUNT);
    const ffiResult = await measureLatency('ffi', MESSAGE_COUNT);

    // Find winner (lowest latency)
    const results = [
      { name: 'stdio', result: stdioResult },
      { name: 'gRPC', result: grpcResult },
      { name: 'msgpack-uds', result: msgpackResult },
      { name: 'ffi', result: ffiResult },
    ];
    results.sort((a, b) => a.result.avgLatencyMs - b.result.avgLatencyMs);
    const winner = results[0];
    const slowest = results[results.length - 1];

    console.log([
      '\n========================================',
      '     PROTOCOL LATENCY COMPARISON',
      '========================================',
      formatResult(stdioResult),
      formatResult(grpcResult),
      formatResult(msgpackResult),
      formatResult(ffiResult),
      '\n=== COMPARISON ===',
      `Winner: ${winner.name}`,
      `Speedup vs slowest: ${(slowest.result.avgLatencyMs / winner.result.avgLatencyMs).toFixed(2)}x`,
      '',
      'Average latencies:',
      `  stdio:       ${stdioResult.avgLatencyMs.toFixed(3)}ms`,
      `  gRPC:        ${grpcResult.avgLatencyMs.toFixed(3)}ms`,
      `  msgpack-uds: ${msgpackResult.avgLatencyMs.toFixed(3)}ms`,
      `  ffi:         ${ffiResult.avgLatencyMs.toFixed(3)}ms`,
      '',
      'Throughput (msg/sec):',
      `  stdio:       ${stdioResult.messagesPerSecond.toFixed(1)}`,
      `  gRPC:        ${grpcResult.messagesPerSecond.toFixed(1)}`,
      `  msgpack-uds: ${msgpackResult.messagesPerSecond.toFixed(1)}`,
      `  ffi:         ${ffiResult.messagesPerSecond.toFixed(1)}`,
    ].join('\n'));

    // No assertion on which is faster - just report
  }, 240000);

  test('burst message test (rapid fire)', async () => {
    const burstResults: string[] = [];

    for (const protocol of ['stdio', 'grpc', 'msgpack-uds', 'ffi'] as const) {
      const tsyneTest = new TsyneTest({ headed: false, bridgeMode: protocol });

      try {
        let windowRef: any;
        const testApp = await tsyneTest.createApp((app) => {
          app.window({ title: 'Burst Test', width: 200, height: 100 }, (win) => {
            windowRef = win;
            app.label('Test');
          });
        });

        await testApp.run();
        if (windowRef) {
          await windowRef.show();
        }
        const bridge = testApp.getBridge();

        // Send 50 messages as fast as possible (no await between sends)
        const start = performance.now();
        const promises: Promise<any>[] = [];

        for (let i = 0; i < 50; i++) {
          promises.push(bridge.send('getAllWidgets', {}));
        }

        await Promise.all(promises);
        const elapsed = performance.now() - start;

        burstResults.push(`${protocol}: 50 burst messages in ${elapsed.toFixed(2)}ms (${(50000 / elapsed).toFixed(1)} msg/sec)`);
      } finally {
        await tsyneTest.cleanup();
      }
    }

    console.log([
      '\n========================================',
      '     BURST MESSAGE TEST (50 rapid)',
      '========================================',
      ...burstResults,
    ].join('\n'));
  }, 80000);
});
