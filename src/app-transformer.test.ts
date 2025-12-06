import { transformAppSource, generateAppToken, generateSandboxedRuntime, transformApp, auditTransformedCode } from './app-transformer';
import * as vm from 'vm';

describe('App Transformer', () => {
  describe('transformAppSource', () => {
    const token = 'test123abc';

    it('should transform require calls', () => {
      const source = `const fs = require('fs');`;
      const result = transformAppSource(source, token);
      expect(result).toContain('__tsyne_test123abc_require__');
      expect(result).not.toMatch(/(?<!__)require(?!__)/);
    });

    it('should transform eval calls', () => {
      const source = `const result = eval('1 + 1');`;
      const result = transformAppSource(source, token);
      expect(result).toContain('__tsyne_test123abc_eval__');
    });

    it('should transform Function constructor', () => {
      const source = `const fn = new Function('return 1');`;
      const result = transformAppSource(source, token);
      expect(result).toContain('__tsyne_test123abc_Function__');
    });

    it('should transform global references', () => {
      const source = `const g = global;`;
      const result = transformAppSource(source, token);
      expect(result).toContain('__tsyne_test123abc_global__');
    });

    it('should transform globalThis references', () => {
      const source = `const g = globalThis;`;
      const result = transformAppSource(source, token);
      expect(result).toContain('__tsyne_test123abc_globalThis__');
    });

    it('should transform process references', () => {
      const source = `const env = process.env;`;
      const result = transformAppSource(source, token);
      expect(result).toContain('__tsyne_test123abc_process__');
    });

    it('should NOT transform variable declarations named require', () => {
      const source = `function foo(require: any) { return require; }`;
      const result = transformAppSource(source, token);
      // The parameter declaration should stay as 'require'
      // But the usage inside should be transformed
      expect(result).toContain('require:');  // parameter name preserved
    });

    it('should transform dynamic import', () => {
      const source = `const mod = await import('./foo');`;
      const result = transformAppSource(source, token);
      expect(result).toContain('__tsyne_test123abc_dynamicImport__');
    });

    it('should handle complex code with multiple transforms', () => {
      const source = `
        const fs = require('fs');
        const result = eval('code');
        const g = global.something;
        process.exit(1);
      `;
      const result = transformAppSource(source, token);
      expect(result).toContain('__tsyne_test123abc_require__');
      expect(result).toContain('__tsyne_test123abc_eval__');
      expect(result).toContain('__tsyne_test123abc_global__');
      expect(result).toContain('__tsyne_test123abc_process__');
    });

    it('should preserve normal code', () => {
      const source = `
        function add(a: number, b: number): number {
          return a + b;
        }
        const result = add(1, 2);
      `;
      const result = transformAppSource(source, token);
      expect(result).toContain('function add');
      expect(result).toContain('return a + b');
    });
  });

  describe('generateAppToken', () => {
    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateAppToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should generate 32-character hex tokens', () => {
      const token = generateAppToken();
      expect(token).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('generateSandboxedRuntime', () => {
    it('should include all transformed identifiers', () => {
      const token = 'abc123';
      const runtime = generateSandboxedRuntime(token, []);

      expect(runtime).toContain('__tsyne_abc123_require__');
      expect(runtime).toContain('__tsyne_abc123_dynamicImport__');
      expect(runtime).toContain('__tsyne_abc123_eval__');
      expect(runtime).toContain('__tsyne_abc123_Function__');
      expect(runtime).toContain('__tsyne_abc123_global__');
      expect(runtime).toContain('__tsyne_abc123_globalThis__');
      expect(runtime).toContain('__tsyne_abc123_process__');
    });

    it('should include allowed modules in require whitelist', () => {
      const token = 'abc123';
      const runtime = generateSandboxedRuntime(token, ['lodash', 'moment']);

      expect(runtime).toContain('"lodash"');
      expect(runtime).toContain('"moment"');
    });
  });

  describe('transformApp', () => {
    it('should return token and combined code', () => {
      const source = `const fs = require('fs');`;
      const result = transformApp(source, 'test-app', []);

      expect(result.token).toMatch(/^[a-f0-9]{32}$/);
      expect(result.code).toContain(`__tsyne_${result.token}_require__`);
      // Runtime should be included
      expect(result.code).toContain('Sandboxed runtime');
    });

    it('should include allowed modules', () => {
      const source = `const _ = require('lodash');`;
      const result = transformApp(source, 'test-app', ['lodash']);

      expect(result.code).toContain('"lodash"');
    });
  });

  describe('auditTransformedCode', () => {
    it('should return empty array for properly transformed app code (not runtime)', () => {
      const source = `const fs = require('fs');`;
      const token = 'abc123';
      // Audit only the transformed app code, NOT the runtime
      // (runtime contains words like 'require' in error messages)
      const transformed = transformAppSource(source, token);

      const warnings = auditTransformedCode(transformed, token);
      expect(warnings.length).toBe(0);
    });
  });

  describe('real-world app simulation', () => {
    it('should transform a chess-like app structure', () => {
      const source = `
        // @tsyne-app:name TestApp
        import { App, app } from 'tsyne';

        interface GameState {
          board: string[][];
        }

        async function createTestApp(a: App): Promise<void> {
          const state: GameState = { board: [] };

          a.window('Test', async () => {
            a.label('Hello');
          });
        }

        if (require.main === module) {
          app({ title: 'Test' }, createTestApp);
        }
      `;

      const result = transformApp(source, 'test-app', []);

      // Should transform the require.main check
      expect(result.code).toContain(`__tsyne_${result.token}_require__`);

      // Should preserve the app structure
      expect(result.code).toContain('createTestApp');
      expect(result.code).toContain('GameState');
      expect(result.code).toContain("a.window('Test'");
    });
  });

  describe('VM sandbox integration tests', () => {
    /**
     * Helper to run transformed code in a VM sandbox
     */
    function runInSandbox(source: string, allowedModules: string[] = []): any {
      const { code } = transformApp(source, 'test-app', allowedModules);

      const sandbox: Record<string, any> = {
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Promise,
        JSON,
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Map,
        Set,
        WeakMap,
        WeakSet,
        Symbol,
        Error,
        TypeError,
        RangeError,
        exports: {},
        module: { exports: {} },
      };
      sandbox.module.exports = sandbox.exports;

      const context = vm.createContext(sandbox);
      vm.runInContext(code, context, { timeout: 5000 });

      return sandbox.module.exports;
    }

    it('should block eval() calls with an error', () => {
      const source = `
        function tryEval() {
          return eval('1 + 1');
        }
        module.exports = { tryEval };
      `;

      const exports = runInSandbox(source);
      expect(() => exports.tryEval()).toThrow('eval() is not allowed in sandboxed apps');
    });

    it('should block Function() constructor with an error', () => {
      const source = `
        function tryFunction() {
          return new Function('return 42')();
        }
        module.exports = { tryFunction };
      `;

      const exports = runInSandbox(source);
      expect(() => exports.tryFunction()).toThrow('Function() constructor is not allowed in sandboxed apps');
    });

    it('should block dynamic import() with an error', () => {
      const source = `
        async function tryImport() {
          return await import('fs');
        }
        module.exports = { tryImport };
      `;

      const exports = runInSandbox(source);
      return expect(exports.tryImport()).rejects.toThrow('Dynamic import() is not allowed in sandboxed apps');
    });

    it('should block require of non-whitelisted modules', () => {
      const source = `
        function tryRequireFs() {
          return require('fs');
        }
        module.exports = { tryRequireFs };
      `;

      const exports = runInSandbox(source, []);  // No modules allowed
      expect(() => exports.tryRequireFs()).toThrow("Module 'fs' is not allowed in sandboxed apps");
    });

    it('should allow require of whitelisted modules (if available)', () => {
      // Note: This test verifies the whitelist logic, but the actual require
      // won't work in the sandbox without proper setup
      const source = `
        function checkWhitelist() {
          // Just check that the function exists and doesn't throw immediately
          // when called with a whitelisted module (even though it won't actually load)
          try {
            require('lodash');
            return 'attempted';
          } catch (e) {
            return e.message;
          }
        }
        module.exports = { checkWhitelist };
      `;

      const exports = runInSandbox(source, ['lodash']);
      const result = exports.checkWhitelist();
      // Should NOT throw "not allowed" error since lodash is whitelisted
      expect(result).not.toContain('is not allowed');
    });

    it('should provide sandboxed process object without real env vars', () => {
      const source = `
        function getProcessInfo() {
          return {
            platform: process.platform,
            envKeys: Object.keys(process.env),
            hasExit: typeof process.exit
          };
        }
        module.exports = { getProcessInfo };
      `;

      const exports = runInSandbox(source);
      const info = exports.getProcessInfo();

      expect(info.platform).toBe('sandboxed');
      expect(info.envKeys).toEqual([]);  // No env vars exposed
      expect(info.hasExit).toBe('undefined');  // No exit function
    });

    it('should provide sandboxed global object without dangerous properties', () => {
      const source = `
        function checkGlobal() {
          return {
            hasConsole: typeof global.console !== 'undefined',
            hasProcess: typeof global.process !== 'undefined',
            hasRequire: typeof global.require !== 'undefined',
            hasEval: typeof global.eval !== 'undefined',
            hasSetTimeout: typeof global.setTimeout !== 'undefined',
          };
        }
        module.exports = { checkGlobal };
      `;

      const exports = runInSandbox(source);
      const checks = exports.checkGlobal();

      expect(checks.hasConsole).toBe(true);  // console is safe
      expect(checks.hasSetTimeout).toBe(true);  // setTimeout is safe
      expect(checks.hasProcess).toBe(false);  // process NOT in sandboxed global
      expect(checks.hasRequire).toBe(false);  // require NOT in sandboxed global
      expect(checks.hasEval).toBe(false);  // eval NOT in sandboxed global
    });

    it('should allow normal code execution', () => {
      const source = `
        function add(a, b) {
          return a + b;
        }

        function multiply(a, b) {
          return a * b;
        }

        function useArray() {
          const arr = [1, 2, 3];
          return arr.map(x => x * 2).reduce((a, b) => a + b, 0);
        }

        function usePromise() {
          return Promise.resolve(42);
        }

        module.exports = { add, multiply, useArray, usePromise };
      `;

      const exports = runInSandbox(source);

      expect(exports.add(2, 3)).toBe(5);
      expect(exports.multiply(4, 5)).toBe(20);
      expect(exports.useArray()).toBe(12);  // (1*2 + 2*2 + 3*2) = 12
      return expect(exports.usePromise()).resolves.toBe(42);
    });

    it('should isolate apps from each other via unique tokens', () => {
      // Transform two apps - they should get different tokens
      const source1 = `const x = require('test');`;
      const source2 = `const y = require('test');`;

      const result1 = transformApp(source1, 'app1', []);
      const result2 = transformApp(source2, 'app2', []);

      // Tokens should be different
      expect(result1.token).not.toBe(result2.token);

      // Each should use its own token in the transformed code
      expect(result1.code).toContain(`__tsyne_${result1.token}_require__`);
      expect(result2.code).toContain(`__tsyne_${result2.token}_require__`);

      // App1's code should NOT contain app2's token
      expect(result1.code).not.toContain(`__tsyne_${result2.token}_`);
      expect(result2.code).not.toContain(`__tsyne_${result1.token}_`);
    });

    it('should prevent apps from guessing other apps function names', () => {
      // An evil app trying to call another app's sandboxed require
      const source = `
        function tryCallOtherAppRequire() {
          // Try to guess another app's require function
          // This should fail because the token is random
          try {
            const fakeToken = 'abc123';
            const fakeFn = global['__tsyne_' + fakeToken + '_require__'];
            if (fakeFn) {
              return fakeFn('fs');
            }
            return 'function not found';
          } catch (e) {
            return 'error: ' + e.message;
          }
        }
        module.exports = { tryCallOtherAppRequire };
      `;

      const exports = runInSandbox(source);
      const result = exports.tryCallOtherAppRequire();

      // The function should not exist in the sandboxed global
      expect(result).toBe('function not found');
    });
  });
});
