/**
 * Integration tests for command pipelining.
 *
 * Verifies that multiple commands can be written to the bridge socket
 * without waiting for individual responses (no messageQueue serialization).
 * Tests all four transports that had messageQueue removed:
 *   1. msgpack-tcp (MsgpackTcpBridgeConnection)
 *   2. msgpack-uds (MsgpackBridgeConnection)
 *   3. grpc local  (GrpcBridgeConnection)
 *   4. grpc-tcp    (GrpcTcpBridgeConnection)
 */
import { ChildProcess, spawn } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import { encode, decode } from '@msgpack/msgpack';
import { MsgpackTcpBridgeConnection } from '../msgpacktcpbridge';
import { MsgpackBridgeConnection } from '../msgpackbridge';
import { Bridge } from '../app';

const BRIDGE_BIN = path.resolve(__dirname, '../../bin/tsyne-bridge');

interface MsgpackMessage {
  id: string;
  type: string;
  payload: Record<string, unknown>;
}

interface MsgpackResponse {
  id: string;
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

/** Spawn bridge in the given mode and wait for LISTEN line to get the port */
function spawnBridge(mode: string = 'msgpack-tcp'): Promise<{ proc: ChildProcess; host: string; port: number }> {
  return new Promise((resolve, reject) => {
    const args = [`--mode=${mode}`, '--headless', '--bind=localhost:0'];
    const proc = spawn(BRIDGE_BIN, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderrBuf = '';
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error('Timed out waiting for bridge LISTEN line'));
    }, 10000);

    proc.stderr!.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString();
      const match = stderrBuf.match(new RegExp(`LISTEN ${mode} on ([^:\\s]+):(\\d+)`));
      if (match) {
        clearTimeout(timeout);
        resolve({ proc, host: match[1], port: parseInt(match[2], 10) });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== null && code !== 0) {
        reject(new Error(`Bridge exited with code ${code}. stderr: ${stderrBuf}`));
      }
    });
  });
}

/** Connect a raw TCP socket */
function tcpConnect(host: string, port: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('TCP connect timeout'));
    }, 5000);
    const socket = net.createConnection({ host, port }, () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function killBridge(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (proc.killed) { resolve(); return; }
    proc.once('exit', () => resolve());
    proc.kill('SIGTERM');
    setTimeout(() => {
      if (!proc.killed) proc.kill('SIGKILL');
      resolve();
    }, 2000);
  }).then(() => {
    proc.stderr?.destroy();
    proc.stdout?.destroy();
    proc.stdin?.destroy();
    proc.removeAllListeners();
  });
}

/** Write one framed msgpack message to the socket without waiting for response */
function sendFrame(socket: net.Socket, msg: MsgpackMessage): void {
  const msgBuf = Buffer.from(encode(msg));
  const frame = Buffer.allocUnsafe(4 + msgBuf.length);
  frame.writeUInt32BE(msgBuf.length, 0);
  msgBuf.copy(frame, 4);
  socket.write(frame);
}

/** Collect N complete response frames from the socket */
function collectResponses(socket: net.Socket, count: number, timeoutMs: number = 10000): Promise<MsgpackResponse[]> {
  return new Promise((resolve, reject) => {
    const responses: MsgpackResponse[] = [];
    let recvBuf = Buffer.allocUnsafe(0);

    const timeout = setTimeout(() => {
      socket.removeListener('data', onData);
      reject(new Error(`Timed out waiting for ${count} responses, got ${responses.length}`));
    }, timeoutMs);

    function onData(chunk: Buffer) {
      recvBuf = Buffer.concat([recvBuf, chunk]);

      // Process all complete frames in the buffer
      while (recvBuf.length >= 4) {
        const frameLen = recvBuf.readUInt32BE(0);
        if (recvBuf.length < 4 + frameLen) break;

        const msgBuf = recvBuf.slice(4, 4 + frameLen);
        recvBuf = recvBuf.slice(4 + frameLen);

        try {
          const resp = decode(msgBuf) as MsgpackResponse;
          responses.push(resp);
        } catch (err) {
          clearTimeout(timeout);
          socket.removeListener('data', onData);
          reject(err);
          return;
        }

        if (responses.length === count) {
          clearTimeout(timeout);
          socket.removeListener('data', onData);
          resolve(responses);
          return;
        }
      }
    }

    socket.on('data', onData);
  });
}

describe('command pipelining', () => {

  test('10 pipelined pings all succeed with correct IDs', async () => {
    const { proc, host, port } = await spawnBridge();
    try {
      const socket = await tcpConnect(host, port);
      try {
        // Send all 10 pings without waiting
        for (let i = 0; i < 10; i++) {
          sendFrame(socket, { id: `ping_${i}`, type: 'ping', payload: {} });
        }

        const responses = await collectResponses(socket, 10);
        expect(responses).toHaveLength(10);
        for (let i = 0; i < 10; i++) {
          expect(responses[i].id).toBe(`ping_${i}`);
          expect(responses[i].success).toBe(true);
          expect(responses[i].result).toEqual({ pong: true });
        }
      } finally {
        socket.destroy();
      }
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('error in pipeline does not break other responses', async () => {
    const { proc, host, port } = await spawnBridge();
    try {
      const socket = await tcpConnect(host, port);
      try {
        // Send: ping, invalid command, ping
        sendFrame(socket, { id: 'p1', type: 'ping', payload: {} });
        sendFrame(socket, { id: 'bad', type: 'noSuchCommand', payload: {} });
        sendFrame(socket, { id: 'p2', type: 'ping', payload: {} });

        const responses = await collectResponses(socket, 3);
        expect(responses[0].id).toBe('p1');
        expect(responses[0].success).toBe(true);

        expect(responses[1].id).toBe('bad');
        expect(responses[1].success).toBe(false);
        expect(responses[1].error).toBeTruthy();

        expect(responses[2].id).toBe('p2');
        expect(responses[2].success).toBe(true);
      } finally {
        socket.destroy();
      }
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('20 pipelined pings return responses in send order', async () => {
    const { proc, host, port } = await spawnBridge();
    try {
      const socket = await tcpConnect(host, port);
      try {
        for (let i = 0; i < 20; i++) {
          sendFrame(socket, { id: `order_${i}`, type: 'ping', payload: {} });
        }

        const responses = await collectResponses(socket, 20);
        for (let i = 0; i < 20; i++) {
          expect(responses[i].id).toBe(`order_${i}`);
        }
      } finally {
        socket.destroy();
      }
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('widget creation burst', async () => {
    const { proc, host, port } = await spawnBridge();
    try {
      const socket = await tcpConnect(host, port);
      try {
        // Pipeline a realistic widget creation burst
        const messages: MsgpackMessage[] = [
          { id: 'w1', type: 'createWindow', payload: { id: 'win1', title: 'Test', width: 400, height: 300 } },
          { id: 'w2', type: 'createLabel', payload: { id: 'lbl1', text: 'Label 1' } },
          { id: 'w3', type: 'createLabel', payload: { id: 'lbl2', text: 'Label 2' } },
          { id: 'w4', type: 'createLabel', payload: { id: 'lbl3', text: 'Label 3' } },
          { id: 'w5', type: 'createLabel', payload: { id: 'lbl4', text: 'Label 4' } },
          { id: 'w6', type: 'createLabel', payload: { id: 'lbl5', text: 'Label 5' } },
          { id: 'w7', type: 'createVBox', payload: { id: 'vbox1', children: ['lbl1', 'lbl2', 'lbl3', 'lbl4', 'lbl5'] } },
          { id: 'w8', type: 'setContent', payload: { windowId: 'win1', widgetId: 'vbox1' } },
        ];

        for (const msg of messages) {
          sendFrame(socket, msg);
        }

        const responses = await collectResponses(socket, messages.length);
        expect(responses).toHaveLength(messages.length);
        for (let i = 0; i < messages.length; i++) {
          expect(responses[i].id).toBe(messages[i].id);
          expect(responses[i].success).toBe(true);
        }
      } finally {
        socket.destroy();
      }
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('MsgpackTcpBridgeConnection concurrent sends via Promise.all', async () => {
    const { proc, host, port } = await spawnBridge();
    try {
      const bridge = new MsgpackTcpBridgeConnection(false, 'localhost', port);
      await bridge.waitUntilReady();
      try {
        // Fire 10 sends without awaiting, then Promise.all
        const promises: Promise<unknown>[] = [];
        for (let i = 0; i < 10; i++) {
          promises.push(bridge.send('ping', {}));
        }

        const results = await Promise.all(promises);
        expect(results).toHaveLength(10);
        for (const result of results) {
          expect(result).toEqual({ pong: true });
        }
      } finally {
        bridge.shutdown();
      }
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('pipelined is faster than sequential', async () => {
    const { proc, host, port } = await spawnBridge();
    try {
      const N = 30;

      // Sequential: send one, wait, send next
      const socketSeq = await tcpConnect(host, port);
      const seqStart = Date.now();
      for (let i = 0; i < N; i++) {
        sendFrame(socketSeq, { id: `seq_${i}`, type: 'ping', payload: {} });
        await collectResponses(socketSeq, 1);
      }
      const seqTime = Date.now() - seqStart;
      socketSeq.destroy();

      // Pipelined: send all, then collect all
      const socketPipe = await tcpConnect(host, port);
      const pipeStart = Date.now();
      for (let i = 0; i < N; i++) {
        sendFrame(socketPipe, { id: `pipe_${i}`, type: 'ping', payload: {} });
      }
      const responses = await collectResponses(socketPipe, N);
      const pipeTime = Date.now() - pipeStart;
      socketPipe.destroy();

      expect(responses).toHaveLength(N);
      // Pipelined should be faster (or at worst equal on localhost)
      // Use a generous threshold — even on localhost pipelining avoids per-message await overhead
      expect(pipeTime).toBeLessThanOrEqual(seqTime);
    } finally {
      await killBridge(proc);
    }
  }, 15000);
});

// ============================================================================
// Transport-level pipelining: verify each changed bridge class can pipeline
// ============================================================================

describe('msgpack-uds pipelining', () => {
  test('MsgpackBridgeConnection concurrent sends via Promise.all', async () => {
    const bridge = new MsgpackBridgeConnection(true);
    await bridge.waitUntilReady();
    try {
      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(bridge.send('ping', {}));
      }
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      for (const result of results) {
        expect(result).toEqual({ pong: true });
      }
    } finally {
      bridge.shutdown();
    }
  }, 15000);
});

describe('grpc-tcp pipelining', () => {
  test('GrpcTcpBridgeConnection concurrent sends via Promise.all', async () => {
    const { proc, host, port } = await spawnBridge('grpc');
    try {
      const bridge = Bridge.connect(`grpc://${host}:${port}`);
      await bridge.waitUntilReady();
      try {
        const promises: Promise<unknown>[] = [];
        for (let i = 0; i < 10; i++) {
          promises.push(bridge.send('ping', {}));
        }
        const results = await Promise.all(promises);
        expect(results).toHaveLength(10);
        for (const result of results) {
          // gRPC returns pong as string 'true'
          expect(result).toEqual({ pong: 'true' });
        }
      } finally {
        bridge.shutdown();
      }
    } finally {
      await killBridge(proc);
    }
  }, 15000);
});

describe('grpc local pipelining', () => {
  test('GrpcBridgeConnection concurrent sends via Promise.all', async () => {
    // GrpcBridgeConnection spawns its own bridge child process with findFreePort()
    const bridge = Bridge.connect('grpc', true);
    await bridge.waitUntilReady();
    try {
      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(bridge.send('ping', {}));
      }
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      for (const result of results) {
        expect(result).toEqual({ pong: 'true' });
      }
    } finally {
      bridge.shutdown();
    }
  }, 15000);
});
