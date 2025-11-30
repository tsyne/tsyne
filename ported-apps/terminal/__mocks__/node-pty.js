/**
 * Mock for node-pty module
 * Used in tests to avoid loading native bindings
 */

const spawn = jest.fn(() => {
  const pty = {
    onData: jest.fn(),
    onExit: jest.fn(),
    write: jest.fn(),
    resize: jest.fn(),
    kill: jest.fn(),
    pid: 12345,
    // --- Test Helpers ---
    // These helpers allow tests to simulate events from the mocked PTY
    _emitData(data) {
      // Call the onData callback if it has been registered
      if (pty.onData.mock.calls.length > 0) {
        pty.onData.mock.calls[0][0](data);
      }
    },
    _emitExit(code, signal) {
      // Call the onExit callback if it has been registered
      if (pty.onExit.mock.calls.length > 0) {
        pty.onExit.mock.calls[0][0]({ exitCode: code, signal: signal || 0 });
      }
    }
  };
  return pty;
});

module.exports = { spawn };