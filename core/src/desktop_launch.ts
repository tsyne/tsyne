/**
 * Desktop App Launcher
 *
 * Handles launching apps with proper sandboxing, service injection, and window management.
 */

import { App } from './app';
import { Window } from './window';
import { DesktopMDI } from './widgets';
import { enableDesktopMode, disableDesktopMode, ITsyneWindow } from './tsyne-window';
import { loadAppBuilder, AppMetadata } from './app-metadata';
import { ScopedResourceManager, ResourceManager } from './resources';
import { SandboxedApp } from './sandboxed-app';
import { WindowMode, OpenApp } from './desktop_types';

import {
  MockClockService,
  MockNotificationService,
  MockStorageService,
  MockSettingsService,
  DesktopAppLifecycle,
  NotAvailableContactsService,
  NotAvailableTelephonyService,
  NotAvailableSMSService,
} from './services';

/** Context required by the app launcher */
export interface AppLauncherContext {
  app: App;
  win: Window;
  desktopMDI: DesktopMDI;
  windowMode: WindowMode;
  openApps: Map<string, OpenApp>;
  onAppLaunched: (appKey: string, openApp: OpenApp) => void;
  onAppClosed: (closedWindow: ITsyneWindow) => void;
  showErrorDialog: (appName: string, error: unknown) => void;
}

/**
 * Handles launching apps with sandboxing and service injection
 */
export class AppLauncher {
  /** Counter for generating unique app instance scopes */
  private appInstanceCounter: Map<string, number> = new Map();

  /**
   * Generate a unique scope name for an app instance (e.g., "chess-1", "chess-2")
   */
  generateAppScope(appName: string): string {
    const count = (this.appInstanceCounter.get(appName) || 0) + 1;
    this.appInstanceCounter.set(appName, count);
    return `${appName.toLowerCase().replace(/\s+/g, '-')}-${count}`;
  }

  /**
   * Launch an app in an inner window using TsyneWindow abstraction.
   * The app's builder calls a.window() which automatically creates
   * an InnerWindow because we're in desktop mode.
   * @param ctx Launcher context
   * @param metadata App metadata
   * @param filePath Optional file path to pass to the app (e.g., for opening files)
   */
  async launchApp(ctx: AppLauncherContext, metadata: AppMetadata, filePath?: string): Promise<void> {
    // Check if already open - bring to front (unless count allows multiple instances)
    if (metadata.count !== 'many' && metadata.count !== 'desktop-many') {
      const existing = ctx.openApps.get(metadata.filePath);
      if (existing) {
        await existing.tsyneWindow.show();
        return;
      }
    }

    // Generate unique scope for this app instance (IoC resource isolation)
    const appScope = this.generateAppScope(metadata.name);

    // Enable desktop mode BEFORE loading the module so that any auto-run
    // app() calls in the module will use the desktop's App instead of creating new ones
    // Only enable if window mode is 'inner' (MDI); external windows don't need desktop mode
    const useInnerWindows = ctx.windowMode === 'inner';
    if (useInnerWindows) {
      enableDesktopMode({
        desktopMDI: ctx.desktopMDI,
        parentWindow: ctx.win,
        desktopApp: ctx.app,
        onWindowClosed: (closedWindow) => ctx.onAppClosed(closedWindow)
      });
    }

    // Create scoped resource manager for this app instance (IoC)
    const scopedResources = new ScopedResourceManager(
      ctx.app.resources as ResourceManager,
      appScope
    );

    // Create sandboxed app for this app instance
    // Apps receive IApp interface, not the real App - prevents cross-app interference
    const sandboxedApp = new SandboxedApp(ctx.app, appScope);

    // Track the created window for cleanup on error
    let createdWindow: ITsyneWindow | null = null;
    let originalWindow: typeof ctx.app.window | null = null;

    try {
      // Load the app's builder function (module auto-run will use desktop mode)
      const builder = await loadAppBuilder(metadata);
      if (!builder) {
        console.error(`Could not load builder for ${metadata.name}`);
        return;
      }

      // Temporarily monkey-patch the REAL app's window method to capture the window
      // The sandboxed app delegates to real app for window creation
      originalWindow = ctx.app.window.bind(ctx.app);
      (ctx.app as any).window = (options: any, builderFn: any) => {
        const win = originalWindow!(options, builderFn);
        createdWindow = win;
        return win;
      };

      // Build argument array based on @tsyne-app:args metadata (poor man's reflection)
      // 'app' now maps to sandboxedApp, not ctx.app
      const argMap: Record<string, any> = {
        'app': sandboxedApp,
        'resources': scopedResources,
        'filePath': filePath,  // Optional file path for opening files
        // General services (available on all platforms)
        'clock': new MockClockService(),
        'notifications': new MockNotificationService(),
        'storage': new MockStorageService(),
        'settings': new MockSettingsService(),
        // Phone-specific services (NotAvailable on desktop - returns "not a phone" errors)
        'telephony': new NotAvailableTelephonyService(),
        'contacts': new NotAvailableContactsService(),
        'sms': new NotAvailableSMSService(),
        // Desktop lifecycle - closes the inner window (closure captures createdWindow)
        'lifecycle': new DesktopAppLifecycle(() => {
          if (createdWindow) {
            createdWindow.close();
          }
        }),
      };

      // Lazily load additional services from phone-apps when needed
      this.loadAdditionalServices(argMap, metadata);

      const args = metadata.args.map(name => argMap[name]);

      // Call builder with the declared arguments
      await builder(...args);

      // Restore original window method
      (ctx.app as any).window = originalWindow;
      originalWindow = null;

      if (createdWindow) {
        // Track the open app - use appScope as key for multi-instance apps
        const appKey = (metadata.count === 'many' || metadata.count === 'desktop-many')
          ? appScope
          : metadata.filePath;
        ctx.onAppLaunched(appKey, { metadata, tsyneWindow: createdWindow });
        console.log(`Launched: ${metadata.name}`);
      }
    } catch (error) {
      // App crashed during launch - clean up and show error
      console.error(`Error launching ${metadata.name}:`, error);

      // Close any partially created window
      const windowToClose = createdWindow as ITsyneWindow | null;
      if (windowToClose) {
        try {
          await windowToClose.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }

      // Show error dialog
      ctx.showErrorDialog(metadata.name, error);
    } finally {
      // Disable desktop mode if we enabled it
      if (useInnerWindows) {
        disableDesktopMode();
      }

      // Restore window method if not already restored
      if (originalWindow) {
        (ctx.app as any).window = originalWindow;
      }
    }
  }

  /**
   * Lazily load additional services from phone-apps when needed
   */
  private loadAdditionalServices(argMap: Record<string, any>, metadata: AppMetadata): void {
    for (const argName of metadata.args) {
      if (argMap[argName] === undefined) {
        try {
          if (argName === 'battery') {
            const { MockBatteryService } = require('../../phone-apps/battery/battery-service');
            argMap['battery'] = new MockBatteryService();
          } else if (argName === 'recording') {
            const { MockRecordingService } = require('../../phone-apps/audio-recorder/recording-service');
            argMap['recording'] = new MockRecordingService();
          } else if (argName === 'camera') {
            const { MockCameraService } = require('../../phone-apps/camera/camera-service');
            argMap['camera'] = new MockCameraService();
          } else if (argName === 'music') {
            const { MockMusicService } = require('../../phone-apps/music-player/music-service');
            argMap['music'] = new MockMusicService();
          } else if (argName === 'calendar') {
            const { MockCalendarService } = require('../../phone-apps/calendar/calendar-service');
            argMap['calendar'] = new MockCalendarService();
          } else if (argName === 'modem') {
            // Modem is phone-only, provide NotAvailable
            argMap['modem'] = { isAvailable: () => false, getUnavailableReason: () => 'Modem is not available on desktop' };
          } else if (argName === 'win') {
            // Apps that require 'win' expect someone else to create the window
            // This is not supported in desktop mode - they should use a.window() instead
            console.warn(`App ${metadata.name} requires 'win' argument which is not available in desktop mode`);
            argMap['win'] = null;
          }
        } catch (err) {
          console.warn(`Could not load service '${argName}' for ${metadata.name}:`, err);
        }
      }
    }
  }
}
