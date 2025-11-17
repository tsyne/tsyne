import { StackTraceParser } from '../../src/stack-trace-parser';

describe('StackTraceParser', () => {
  describe('parseStackTrace', () => {
    test('should parse Node.js stack trace with parentheses format', () => {
      const stack = `Error
    at captureWidget (/home/user/designer/server.ts:45:10)
    at userCode (/home/user/examples/hello.ts:123:45)
    at Object.<anonymous> (/home/user/examples/hello.ts:200:10)`;

      const location = StackTraceParser.parseStackTrace(stack, 2);

      expect(location).toEqual({
        file: '/home/user/examples/hello.ts',
        line: 123,
        column: 45
      });
    });

    test('should parse simple format without parentheses', () => {
      const stack = `Error
    at /home/user/designer/server.ts:45:10
    at /home/user/examples/hello.ts:123:45`;

      const location = StackTraceParser.parseStackTrace(stack, 2);

      expect(location).toEqual({
        file: '/home/user/examples/hello.ts',
        line: 123,
        column: 45
      });
    });

    test('should skip internal files', () => {
      const stack = `Error
    at captureWidget (/home/user/designer/server.ts:45:10)
    at designer (/home/user/node_modules/tsyne/dist/index.js:100:20)
    at userCode (/home/user/examples/hello.ts:123:45)`;

      const location = StackTraceParser.parseStackTrace(stack, 1);

      expect(location).toEqual({
        file: '/home/user/examples/hello.ts',
        line: 123,
        column: 45
      });
    });

    test('should return null if no valid location found', () => {
      const stack = `Error
    at captureWidget (/home/user/designer/server.ts:45:10)
    at designer (/home/user/node_modules/tsyne/dist/index.js:100:20)`;

      const location = StackTraceParser.parseStackTrace(stack, 1);

      expect(location).toBeNull();
    });

    test('should handle custom skipFrames parameter', () => {
      const stack = `Error
    at frame1 (/home/user/file1.ts:1:1)
    at frame2 (/home/user/file2.ts:2:2)
    at frame3 (/home/user/examples/hello.ts:123:45)`;

      const location = StackTraceParser.parseStackTrace(stack, 3);

      expect(location).toEqual({
        file: '/home/user/examples/hello.ts',
        line: 123,
        column: 45
      });
    });
  });

  describe('getRelativePath', () => {
    test('should get relative path from base directory', () => {
      const result = StackTraceParser.getRelativePath(
        '/home/user/tsyne/examples/hello.ts',
        '/home/user/tsyne'
      );

      expect(result).toBe('examples/hello.ts');
    });

    test('should return filename if no base directory provided', () => {
      const result = StackTraceParser.getRelativePath(
        '/home/user/tsyne/examples/hello.ts'
      );

      expect(result).toBe('hello.ts');
    });

    test('should return filename if path does not start with base directory', () => {
      const result = StackTraceParser.getRelativePath(
        '/home/user/other/hello.ts',
        '/home/user/tsyne'
      );

      expect(result).toBe('hello.ts');
    });
  });
});
