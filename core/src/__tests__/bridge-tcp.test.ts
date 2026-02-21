/**
 * Integration tests for TCP transports (msgpack-tcp and grpc-tcp).
 *
 * Spawns a real tsyne-bridge process, connects via Bridge.connect(),
 * verifies round-trip, and tears down cleanly (releasing the temp port).
 */
import { ChildProcess, spawn } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import { encode, decode } from '@msgpack/msgpack';
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
function spawnBridge(token?: string, mode: string = 'msgpack-tcp', tlsOpts?: { certPath: string; keyPath: string }): Promise<{ proc: ChildProcess; host: string; port: number }> {
  return new Promise((resolve, reject) => {
    const args = [`--mode=${mode}`, '--headless', '--bind=localhost:0'];
    if (token) {
      args.push(`--token=${token}`);
    }
    if (tlsOpts) {
      args.push(`--tls-cert=${tlsOpts.certPath}`, `--tls-key=${tlsOpts.keyPath}`);
    }

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
      // Look for: LISTEN <mode> on 127.0.0.1:43567
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

/** Send a framed msgpack message over a socket and read the framed response */
function sendAndReceive(socket: net.Socket, msg: MsgpackMessage): Promise<MsgpackResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for response'));
    }, 5000);

    // Build frame: [4-byte BE length][msgpack payload]
    const msgBuf = Buffer.from(encode(msg));
    const frame = Buffer.allocUnsafe(4 + msgBuf.length);
    frame.writeUInt32BE(msgBuf.length, 0);
    msgBuf.copy(frame, 4);

    // Set up one-shot data handler to read the response frame
    let recvBuf = Buffer.allocUnsafe(0);
    const onData = (chunk: Buffer) => {
      recvBuf = Buffer.concat([recvBuf, chunk]);

      // Need at least 4 bytes for length prefix
      if (recvBuf.length < 4) return;
      const respLen = recvBuf.readUInt32BE(0);
      if (recvBuf.length < 4 + respLen) return;

      // Got complete frame
      socket.removeListener('data', onData);
      clearTimeout(timeout);

      const respBuf = recvBuf.slice(4, 4 + respLen);
      try {
        const resp = decode(respBuf) as MsgpackResponse;
        resolve(resp);
      } catch (err) {
        reject(err);
      }
    };

    socket.on('data', onData);
    socket.write(frame);
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
    // Clean up all stdio streams and listeners to prevent Jest from hanging
    proc.stderr?.destroy();
    proc.stdout?.destroy();
    proc.stdin?.destroy();
    proc.removeAllListeners();
  });
}

describe('msgpack-tcp transport', () => {
  test('ping-pong round-trip without auth', async () => {
    const { proc, host, port } = await spawnBridge();
    try {
      const socket = await tcpConnect(host, port);
      try {
        const resp = await sendAndReceive(socket, {
          id: 'tcp_test_1',
          type: 'ping',
          payload: {},
        });

        expect(resp.id).toBe('tcp_test_1');
        expect(resp.success).toBe(true);
        expect(resp.result).toEqual({ pong: true });
      } finally {
        socket.destroy();
      }
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('ping-pong with auth token', async () => {
    const token = 'testtoken_abc123';
    const { proc, host, port } = await spawnBridge(token);
    try {
      const socket = await tcpConnect(host, port);
      try {
        // Step 1: Authenticate
        const authResp = await sendAndReceive(socket, {
          id: 'auth_1',
          type: 'auth',
          payload: { token },
        });
        expect(authResp.success).toBe(true);

        // Step 2: Send ping after auth
        const pingResp = await sendAndReceive(socket, {
          id: 'tcp_test_2',
          type: 'ping',
          payload: {},
        });
        expect(pingResp.success).toBe(true);
        expect(pingResp.result).toEqual({ pong: true });
      } finally {
        socket.destroy();
      }
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('auth rejection with wrong token', async () => {
    const { proc, host, port } = await spawnBridge('correct_token');
    try {
      const socket = await tcpConnect(host, port);
      try {
        const authResp = await sendAndReceive(socket, {
          id: 'auth_bad',
          type: 'auth',
          payload: { token: 'wrong_token' },
        });
        expect(authResp.success).toBe(false);
        expect(authResp.error).toBeTruthy();
      } finally {
        socket.destroy();
      }
    } finally {
      await killBridge(proc);
    }
  }, 15000);
});

describe('Bridge.parse()', () => {
  test('bare scheme: msgpack-uds', () => {
    const config = Bridge.parse('msgpack-uds');
    expect(config).toEqual({ mode: 'msgpack-uds' });
  });

  test('bare scheme: stdio', () => {
    const config = Bridge.parse('stdio');
    expect(config).toEqual({ mode: 'stdio' });
  });

  test('bare scheme: grpc', () => {
    const config = Bridge.parse('grpc');
    expect(config).toEqual({ mode: 'grpc' });
  });

  test('grpcs URL with host, port, and token', () => {
    const config = Bridge.parse('grpcs://192.168.1.42:50051#secret');
    expect(config).toEqual({
      mode: 'grpcs',
      host: '192.168.1.42',
      port: 50051,
      token: 'secret',
    });
  });

  test('full URL with host, port, and token', () => {
    const config = Bridge.parse('msgpack-tcp://192.168.1.42:9800#secret');
    expect(config).toEqual({
      mode: 'msgpack-tcp',
      host: '192.168.1.42',
      port: 9800,
      token: 'secret',
    });
  });

  test('URL with host and port, no token', () => {
    const config = Bridge.parse('msgpack-tcp://localhost:9800');
    expect(config).toEqual({
      mode: 'msgpack-tcp',
      host: 'localhost',
      port: 9800,
    });
  });

  test('URL with host only', () => {
    const config = Bridge.parse('msgpack-tcp://myhost');
    expect(config).toEqual({
      mode: 'msgpack-tcp',
      host: 'myhost',
    });
  });

  test('URL with empty authority', () => {
    const config = Bridge.parse('msgpack-tcp://');
    expect(config).toEqual({ mode: 'msgpack-tcp' });
  });

  test('invalid bare scheme throws', () => {
    expect(() => Bridge.parse('invalid')).toThrow('Invalid bridge URL: invalid');
  });

  test('invalid URL scheme throws', () => {
    expect(() => Bridge.parse('http://localhost:9800')).toThrow('Invalid bridge scheme: http');
  });

  test('msgpack-tcp+tls URL with host, port, and token', () => {
    const config = Bridge.parse('msgpack-tcp+tls://192.168.1.42:9800#secret');
    expect(config).toEqual({
      mode: 'msgpack-tcp+tls',
      host: '192.168.1.42',
      port: 9800,
      token: 'secret',
    });
  });
});

describe('Bridge.fromArgsOrEnv()', () => {
  test('extracts --bridge= from argv', async () => {
    const { proc, host, port } = await spawnBridge();
    try {
      const argv = ['node', 'app.js', '--title=Chess', `--bridge=msgpack-tcp://${host}:${port}`];
      const bridge = Bridge.fromArgsOrEnv(argv);
      await bridge.waitUntilReady();
      const result = await bridge.send('ping', {}) as { pong: boolean };
      expect(result).toEqual({ pong: true });
      bridge.shutdown();
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('extracts --bridge= with auth token', async () => {
    const token = 'argv_token_123';
    const { proc, host, port } = await spawnBridge(token);
    try {
      const argv = ['node', 'app.js', `--bridge=msgpack-tcp://${host}:${port}#${token}`];
      const bridge = Bridge.fromArgsOrEnv(argv);
      await bridge.waitUntilReady();
      const result = await bridge.send('ping', {}) as { pong: boolean };
      expect(result).toEqual({ pong: true });
      bridge.shutdown();
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('falls back to env when no --bridge arg', async () => {
    // When --bridge is absent, fromArgsOrEnv falls back to TSYNE_BRIDGE → TSYNE_BRIDGE_MODE → msgpack-uds.
    // Set TSYNE_BRIDGE to a TCP URL so we can verify the fallback without spawning a UDS bridge.
    const { proc, host, port } = await spawnBridge();
    const prev = process.env.TSYNE_BRIDGE;
    try {
      process.env.TSYNE_BRIDGE = `msgpack-tcp://${host}:${port}`;
      const argv = ['node', 'app.js', '--other=stuff'];
      const bridge = Bridge.fromArgsOrEnv(argv);
      await bridge.waitUntilReady();
      const result = await bridge.send('ping', {}) as { pong: boolean };
      expect(result).toEqual({ pong: true });
      bridge.shutdown();
    } finally {
      if (prev === undefined) delete process.env.TSYNE_BRIDGE;
      else process.env.TSYNE_BRIDGE = prev;
      await killBridge(proc);
    }
  }, 15000);
});

// ============================================================================
// Integration tests: spawn server → connect client → ping → tear down
// Both TCP transports tested symmetrically.
// ============================================================================

describe.each([
  { scheme: 'msgpack-tcp', mode: 'msgpack-tcp', expectedPong: { pong: true } },
  { scheme: 'grpc',        mode: 'grpc',        expectedPong: { pong: 'true' } },
])('$scheme integration', ({ scheme, mode, expectedPong }) => {

  test('connect, ping-pong, shutdown (no auth)', async () => {
    const { proc, host, port } = await spawnBridge(undefined, mode);
    try {
      const bridge = Bridge.connect(`${scheme}://${host}:${port}`);
      await bridge.waitUntilReady();
      const result = await bridge.send('ping', {});
      expect(result).toEqual(expectedPong);
      bridge.shutdown();
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('connect with auth token, ping-pong, shutdown', async () => {
    const token = `${mode}_integ_token`;
    const { proc, host, port } = await spawnBridge(token, mode);
    try {
      const bridge = Bridge.connect(`${scheme}://${host}:${port}#${token}`);
      await bridge.waitUntilReady();
      const result = await bridge.send('ping', {});
      expect(result).toEqual(expectedPong);
      bridge.shutdown();
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('fromArgsOrEnv with --bridge= flag', async () => {
    const { proc, host, port } = await spawnBridge(undefined, mode);
    try {
      const argv = ['node', 'app.js', `--bridge=${scheme}://${host}:${port}`];
      const bridge = Bridge.fromArgsOrEnv(argv);
      await bridge.waitUntilReady();
      const result = await bridge.send('ping', {});
      expect(result).toEqual(expectedPong);
      bridge.shutdown();
    } finally {
      await killBridge(proc);
    }
  }, 15000);
});

// ============================================================================
// TLS integration tests (grpcs://)
// ============================================================================

const TLS_CERT_PATH = path.resolve(__dirname, '../../testdata/tls-test-cert.pem');
const TLS_KEY_PATH = path.resolve(__dirname, '../../testdata/tls-test-key.pem');

describe('grpcs:// TLS transport', () => {
  test('connect, ping, shutdown', async () => {
    const { proc, host, port } = await spawnBridge(undefined, 'grpc', { certPath: TLS_CERT_PATH, keyPath: TLS_KEY_PATH });
    try {
      const bridge = Bridge.connect(`grpcs://${host}:${port}`, false, { tlsCaCert: TLS_CERT_PATH });
      await bridge.waitUntilReady();
      const result = await bridge.send('ping', {});
      expect(result).toEqual({ pong: 'true' });
      bridge.shutdown();
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('connect with auth token', async () => {
    const token = 'tls_test_token_123';
    const { proc, host, port } = await spawnBridge(token, 'grpc', { certPath: TLS_CERT_PATH, keyPath: TLS_KEY_PATH });
    try {
      const bridge = Bridge.connect(`grpcs://${host}:${port}#${token}`, false, { tlsCaCert: TLS_CERT_PATH });
      await bridge.waitUntilReady();
      const result = await bridge.send('ping', {});
      expect(result).toEqual({ pong: 'true' });
      bridge.shutdown();
    } finally {
      await killBridge(proc);
    }
  }, 15000);
});

// ============================================================================
// TLS integration tests (msgpack-tcp+tls://)
// ============================================================================

describe('msgpack-tcp+tls:// TLS transport', () => {
  test('connect, ping, shutdown', async () => {
    const { proc, host, port } = await spawnBridge(undefined, 'msgpack-tcp', { certPath: TLS_CERT_PATH, keyPath: TLS_KEY_PATH });
    try {
      const bridge = Bridge.connect(`msgpack-tcp+tls://${host}:${port}`, false, { tlsCaCert: TLS_CERT_PATH });
      await bridge.waitUntilReady();
      const result = await bridge.send('ping', {});
      expect(result).toEqual({ pong: true });
      bridge.shutdown();
    } finally {
      await killBridge(proc);
    }
  }, 15000);

  test('connect with auth token', async () => {
    const token = 'msgpack_tls_token_456';
    const { proc, host, port } = await spawnBridge(token, 'msgpack-tcp', { certPath: TLS_CERT_PATH, keyPath: TLS_KEY_PATH });
    try {
      const bridge = Bridge.connect(`msgpack-tcp+tls://${host}:${port}#${token}`, false, { tlsCaCert: TLS_CERT_PATH });
      await bridge.waitUntilReady();
      const result = await bridge.send('ping', {});
      expect(result).toEqual({ pong: true });
      bridge.shutdown();
    } finally {
      await killBridge(proc);
    }
  }, 15000);
});
