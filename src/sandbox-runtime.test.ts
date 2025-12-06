import {
  createSandboxRuntime,
  executeInSandbox,
  isIsolatedVmAvailable,
  getRecommendedRuntime,
  SandboxRuntimeType
} from './sandbox-runtime';
import { transformApp } from './app-transformer';

describe('Sandbox Runtime', () => {
  describe('vm runtime', () => {
    it('should execute simple code', async () => {
      const source = `
        function add(a, b) { return a + b; }
        module.exports = { add };
      `;

      const result = await executeInSandbox(source, 'test-app', {
        runtime: 'vm',
        allowedModules: []
      });

      expect(result.runtime).toBe('vm');
      expect(result.token).toMatch(/^[a-f0-9]{32}$/);
      expect(result.exports.add(2, 3)).toBe(5);
    });

    it('should block eval', async () => {
      const source = `
        function tryEval() { return eval('1+1'); }
        module.exports = { tryEval };
      `;

      const result = await executeInSandbox(source, 'test-app', {
        runtime: 'vm',
        allowedModules: []
      });

      expect(() => result.exports.tryEval()).toThrow('eval() is not allowed');
    });

    it('should block require of non-whitelisted modules', async () => {
      const source = `
        function tryFs() { return require('fs'); }
        module.exports = { tryFs };
      `;

      const result = await executeInSandbox(source, 'test-app', {
        runtime: 'vm',
        allowedModules: []
      });

      expect(() => result.exports.tryFs()).toThrow("Module 'fs' is not allowed");
    });

    it('should provide sandboxed process', async () => {
      const source = `
        function getPlatform() { return process.platform; }
        module.exports = { getPlatform };
      `;

      const result = await executeInSandbox(source, 'test-app', {
        runtime: 'vm',
        allowedModules: []
      });

      expect(result.exports.getPlatform()).toBe('sandboxed');
    });

    it('should timeout on infinite loops', async () => {
      const source = `
        while(true) {}
        module.exports = {};
      `;

      await expect(executeInSandbox(source, 'test-app', {
        runtime: 'vm',
        timeoutMs: 100,
        allowedModules: []
      })).rejects.toThrow();
    });
  });

  describe('createSandboxRuntime', () => {
    it('should create vm runtime', () => {
      const runtime = createSandboxRuntime('vm');
      expect(runtime).toBeDefined();
      runtime.dispose();
    });

    it('should throw for unknown runtime type', () => {
      expect(() => createSandboxRuntime('unknown' as SandboxRuntimeType))
        .toThrow('Unknown sandbox runtime type');
    });
  });

  describe('isIsolatedVmAvailable', () => {
    it('should return boolean', async () => {
      const available = await isIsolatedVmAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('getRecommendedRuntime', () => {
    it('should return vm if isolated-vm not available and not required', async () => {
      const runtime = await getRecommendedRuntime(false);
      expect(['vm', 'isolated-vm']).toContain(runtime);
    });

    it('should throw if secure required but isolated-vm not available', async () => {
      const available = await isIsolatedVmAvailable();
      if (!available) {
        await expect(getRecommendedRuntime(true)).rejects.toThrow('isolated-vm is not installed');
      }
    });
  });

  describe('isolation between apps', () => {
    it('should give different tokens to different apps', async () => {
      const source = `module.exports = { x: 1 };`;

      const result1 = await executeInSandbox(source, 'app1', { runtime: 'vm', allowedModules: [] });
      const result2 = await executeInSandbox(source, 'app2', { runtime: 'vm', allowedModules: [] });

      expect(result1.token).not.toBe(result2.token);
    });
  });
});

describe('Sandbox Runtime with isolated-vm (if available)', () => {
  let ivmAvailable: boolean = false;

  beforeAll(async () => {
    // Direct require check - more reliable than the async function in Jest
    try {
      require('isolated-vm');
      ivmAvailable = true;
    } catch {
      ivmAvailable = false;
    }
  });

  it('should execute simple code in isolated-vm', async () => {
    if (!ivmAvailable) return;

    // Note: isolated-vm can't clone functions across the boundary
    // So we test with data exports instead
    const source = `
      const result = 4 * 5;
      module.exports = { result, name: 'test' };
    `;

    const result = await executeInSandbox(source, 'test-app', {
      runtime: 'isolated-vm',
      memoryLimitMB: 32,
      allowedModules: []
    });

    expect(result.runtime).toBe('isolated-vm');
    expect(result.exports.result).toBe(20);
    expect(result.exports.name).toBe('test');
  });

  it('should enforce memory limits in isolated-vm', async () => {
    if (!ivmAvailable) return;

    const source = `
      // Try to allocate lots of memory
      const arr = [];
      for (let i = 0; i < 100000000; i++) {
        arr.push(new Array(1000).fill('x'));
      }
      module.exports = { arr };
    `;

    await expect(executeInSandbox(source, 'test-app', {
      runtime: 'isolated-vm',
      memoryLimitMB: 8,  // Very low limit
      timeoutMs: 5000,
      allowedModules: []
    })).rejects.toThrow();
  });
});
