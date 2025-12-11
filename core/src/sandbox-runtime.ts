/**
 * Sandbox Runtime - Pluggable VM execution layer
 *
 * Two implementations:
 * 1. 'vm' - Node's built-in vm module (fast, but prototype escape possible)
 * 2. 'isolated-vm' - True V8 isolate (secure, memory/CPU limits)
 *
 * The AST transformation (app-transformer.ts) rewrites dangerous identifiers.
 * This module executes the transformed code in a sandboxed environment.
 */

import { transformApp } from './app-transformer';

/**
 * Sandbox runtime type
 */
export type SandboxRuntimeType = 'vm' | 'isolated-vm';

/**
 * Configuration for sandbox execution
 */
export interface SandboxExecutionConfig {
  /** Which runtime to use */
  runtime: SandboxRuntimeType;
  /** Memory limit in MB (isolated-vm only) */
  memoryLimitMB?: number;
  /** Execution timeout in milliseconds */
  timeoutMs?: number;
  /** Modules the app is allowed to require */
  allowedModules?: string[];
}

/**
 * Result of sandbox execution
 */
export interface SandboxExecutionResult {
  /** The module exports from the sandboxed code */
  exports: Record<string, any>;
  /** The unique token used for this app */
  token: string;
  /** Which runtime was used */
  runtime: SandboxRuntimeType;
}

/**
 * Interface for sandbox runtime implementations
 */
export interface ISandboxRuntime {
  /**
   * Execute transformed code and return exports
   */
  execute(
    transformedCode: string,
    token: string,
    config: SandboxExecutionConfig
  ): Promise<Record<string, any>>;

  /**
   * Clean up any resources
   */
  dispose(): void;
}

/**
 * Node.js vm-based runtime (fast, weaker isolation)
 */
class VmRuntime implements ISandboxRuntime {
  async execute(
    transformedCode: string,
    token: string,
    config: SandboxExecutionConfig
  ): Promise<Record<string, any>> {
    // Lazy import to avoid loading if not used
    const vm = await import('vm');

    const sandbox: Record<string, any> = {
      // Standard globals (safe subset)
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
      Buffer,

      // Module system shims
      exports: {},
      module: { exports: {} },
    };

    sandbox.module.exports = sandbox.exports;

    const context = vm.createContext(sandbox);
    vm.runInContext(transformedCode, context, {
      filename: 'sandboxed-app.js',
      timeout: config.timeoutMs || 5000,
    });

    return sandbox.module.exports;
  }

  dispose(): void {
    // Nothing to clean up for vm
  }
}

/**
 * isolated-vm based runtime (secure, true V8 isolate)
 */
class IsolatedVmRuntime implements ISandboxRuntime {
  private isolate: any = null;

  async execute(
    transformedCode: string,
    token: string,
    config: SandboxExecutionConfig
  ): Promise<Record<string, any>> {
    // Lazy import - will fail if isolated-vm not installed
    // Use require() to avoid TypeScript compile-time errors for optional dependency
    let ivm: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ivm = require('isolated-vm');
    } catch (e) {
      throw new Error(
        'isolated-vm is not installed. Install it with: npm install isolated-vm\n' +
        'Or use runtime: "vm" for the built-in (less secure) sandbox.'
      );
    }

    // Create isolate with memory limit
    this.isolate = new ivm.Isolate({
      memoryLimit: config.memoryLimitMB || 128
    });

    const context = await this.isolate.createContext();

    // Set up globals and module system
    const jail = context.global;
    await jail.set('global', jail.derefInto());

    // Set up module/exports on global so they persist across evals
    await context.eval(`
      global.module = { exports: {} };
      global.exports = global.module.exports;

      // Safe globals
      global.console = {
        log: (...args) => {},
        error: (...args) => {},
        warn: (...args) => {},
      };
      global.setTimeout = (fn, ms) => { /* stub */ };
      global.clearTimeout = (id) => {};
      global.setInterval = (fn, ms) => { /* stub */ };
      global.clearInterval = (id) => {};

      // Make module/exports available at top level
      var module = global.module;
      var exports = global.exports;
    `);

    // Run the transformed code
    await context.eval(transformedCode, {
      timeout: config.timeoutMs || 5000
    });

    // Extract exports - use global.module since that's where exports are stored
    const exportsRef = await context.eval('global.module.exports', { copy: true });

    return exportsRef;
  }

  dispose(): void {
    if (this.isolate) {
      this.isolate.dispose();
      this.isolate = null;
    }
  }
}

/**
 * Get a sandbox runtime instance
 */
export function createSandboxRuntime(type: SandboxRuntimeType): ISandboxRuntime {
  switch (type) {
    case 'vm':
      return new VmRuntime();
    case 'isolated-vm':
      return new IsolatedVmRuntime();
    default:
      throw new Error(`Unknown sandbox runtime type: ${type}`);
  }
}

/**
 * Execute app source code in a sandbox
 *
 * This is the main entry point - it transforms the source and executes it.
 */
export async function executeInSandbox(
  source: string,
  appName: string,
  config: SandboxExecutionConfig
): Promise<SandboxExecutionResult> {
  // Transform the source code
  const { token, code } = transformApp(
    source,
    appName,
    config.allowedModules || []
  );

  // Create runtime and execute
  const runtime = createSandboxRuntime(config.runtime);

  try {
    const exports = await runtime.execute(code, token, config);

    return {
      exports,
      token,
      runtime: config.runtime
    };
  } finally {
    runtime.dispose();
  }
}

/**
 * Check if isolated-vm is available
 */
export async function isIsolatedVmAvailable(): Promise<boolean> {
  try {
    // Use require() to avoid TypeScript compile-time errors for optional dependency
    require('isolated-vm');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get recommended runtime based on availability and security needs
 */
export async function getRecommendedRuntime(requireSecure: boolean = false): Promise<SandboxRuntimeType> {
  const ivmAvailable = await isIsolatedVmAvailable();

  if (requireSecure && !ivmAvailable) {
    throw new Error(
      'Secure sandbox requested but isolated-vm is not installed.\n' +
      'Install it with: npm install isolated-vm'
    );
  }

  return ivmAvailable ? 'isolated-vm' : 'vm';
}
