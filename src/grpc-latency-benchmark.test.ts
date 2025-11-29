/**
 * gRPC vs stdio Latency Benchmark
 *
 * Measures per-message round-trip latency for both protocols.
 * This test creates many small messages to isolate protocol overhead.
 */

import { TsyneTest } from './index-test';

interface LatencyResult {
  protocol: 'stdio' | 'grpc' | 'msgpack-uds';
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
  protocol: 'stdio' | 'grpc' | 'msgpack-uds',
  messageCount: number
): Promise<LatencyResult> {
  const tsyneTest = new TsyneTest({ headed: false, bridgeMode: protocol });
  const latencies: number[] = [];

  try {
    const testApp = await tsyneTest.createApp((app) => {
      // Create minimal window
      app.window({ title: 'Latency Test', width: 200, height: 100 }, (win) => {
        win.setContent(() => { app.label('Test'); });
        win.show();
      });
    });

    await testApp.run();
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

  test('compare all protocols latency', async () => {
    console.log('\n========================================');
    console.log('     PROTOCOL LATENCY COMPARISON');
    console.log('========================================');

    // Run all three protocols
    const stdioResult = await measureLatency('stdio', MESSAGE_COUNT);
    const grpcResult = await measureLatency('grpc', MESSAGE_COUNT);
    const msgpackResult = await measureLatency('msgpack-uds', MESSAGE_COUNT);

    console.log(formatResult(stdioResult));
    console.log(formatResult(grpcResult));
    console.log(formatResult(msgpackResult));

    // Find winner (lowest latency)
    const results = [
      { name: 'stdio', result: stdioResult },
      { name: 'gRPC', result: grpcResult },
      { name: 'msgpack-uds', result: msgpackResult },
    ];
    results.sort((a, b) => a.result.avgLatencyMs - b.result.avgLatencyMs);
    const winner = results[0];
    const slowest = results[results.length - 1];

    console.log('\n=== COMPARISON ===');
    console.log(`Winner: ${winner.name}`);
    console.log(`Speedup vs slowest: ${(slowest.result.avgLatencyMs / winner.result.avgLatencyMs).toFixed(2)}x`);
    console.log('');
    console.log('Average latencies:');
    console.log(`  stdio:       ${stdioResult.avgLatencyMs.toFixed(3)}ms`);
    console.log(`  gRPC:        ${grpcResult.avgLatencyMs.toFixed(3)}ms`);
    console.log(`  msgpack-uds: ${msgpackResult.avgLatencyMs.toFixed(3)}ms`);
    console.log('');
    console.log('Throughput (msg/sec):');
    console.log(`  stdio:       ${stdioResult.messagesPerSecond.toFixed(1)}`);
    console.log(`  gRPC:        ${grpcResult.messagesPerSecond.toFixed(1)}`);
    console.log(`  msgpack-uds: ${msgpackResult.messagesPerSecond.toFixed(1)}`);

    // No assertion on which is faster - just report
  }, 180000);

  test('burst message test (rapid fire)', async () => {
    console.log('\n========================================');
    console.log('     BURST MESSAGE TEST (50 rapid)');
    console.log('========================================');

    for (const protocol of ['stdio', 'grpc', 'msgpack-uds'] as const) {
      const tsyneTest = new TsyneTest({ headed: false, bridgeMode: protocol });

      try {
        const testApp = await tsyneTest.createApp((app) => {
          app.window({ title: 'Burst Test', width: 200, height: 100 }, (win) => {
            win.setContent(() => { app.label('Test'); });
            win.show();
          });
        });

        await testApp.run();
        const bridge = testApp.getBridge();

        // Send 50 messages as fast as possible (no await between sends)
        const start = performance.now();
        const promises: Promise<any>[] = [];

        for (let i = 0; i < 50; i++) {
          promises.push(bridge.send('getAllWidgets', {}));
        }

        await Promise.all(promises);
        const elapsed = performance.now() - start;

        console.log(`${protocol}: 50 burst messages in ${elapsed.toFixed(2)}ms (${(50000 / elapsed).toFixed(1)} msg/sec)`);
      } finally {
        await tsyneTest.cleanup();
      }
    }
  }, 60000);
});
