/**
 * Debug Launcher
 *
 * Thin wrapper for standalone apps that want debug server capability.
 * Provides a Window as the debug host with no custom endpoints.
 *
 * Usage:
 *   a.window({ title: 'My App' }, (win) => {
 *     win.setContent(() => { ... });
 *     win.show();
 *     DebugLauncher.attachIfRequested(a, win);
 *   });
 *
 * Then run with: TSYNE_DEBUG_PORT=9222 ./scripts/tsyne my-app.ts
 */

import { App } from './app';
import { Window } from './window';
import { DebugServer, IDebugHost } from './debug-server';

export interface DebugLauncherOptions {
  port?: number;
  token?: string;
  label?: string;
}

export class DebugLauncher {
  private debugServer: DebugServer;

  constructor(app: App, win: Window, options?: DebugLauncherOptions) {
    const port = options?.port || parseInt(process.env.TSYNE_DEBUG_PORT || '0', 10);
    if (!port) {
      throw new Error('DebugLauncher requires a port (via options.port or TSYNE_DEBUG_PORT env)');
    }

    const host: IDebugHost = {
      get mainWindow() { return win; },
    };

    this.debugServer = new DebugServer(app, host, {
      port,
      token: options?.token,
      label: options?.label || 'debug',
    });
  }

  start(): void {
    this.debugServer.start();
  }

  stop(): void {
    this.debugServer.stop();
  }

  getToken(): string {
    return this.debugServer.getToken();
  }

  /**
   * Attach a debug server if TSYNE_DEBUG_PORT is set; no-op otherwise.
   * Registers cleanup callback on the app.
   */
  static attachIfRequested(app: App, win: Window, options?: DebugLauncherOptions): DebugLauncher | null {
    const port = options?.port || parseInt(process.env.TSYNE_DEBUG_PORT || '0', 10);
    if (!port) return null;

    const launcher = new DebugLauncher(app, win, { ...options, port });
    launcher.start();

    app.registerCleanup(() => {
      launcher.stop();
    });

    return launcher;
  }
}
