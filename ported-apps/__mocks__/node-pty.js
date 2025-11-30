/**
 * Mock for node-pty module
 * Used in tests to avoid loading native bindings
 */

const spawn = jest.fn(() => {
  return {
    onData: jest.fn(),
    onExit: jest.fn(),
    write: jest.fn(),
    resize: jest.fn(),
    kill: jest.fn(),
    pid: 12345,
  };
});

module.exports = { spawn };
