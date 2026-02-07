/**
 * Generic app launcher for discovering and launching child applications
 *
 * ## Architecture
 *
 * This launcher spawns child applications as **separate Node.js processes**, unlike Desktop/PhoneTop
 * which load applications as modules within the same process.
 *
 * ### Key Differences
 *
 * **Launchers (Demos, Examples) - This Module:**
 * - Spawns child apps via `spawn('npx', ['tsx', filePath])` → separate process
 * - Each app has its own `App` instance
 * - Apps call their main() method (`if (require.main === module)` block)
 * - When a child app's last window closes → process exits
 * - No service injection (each app is independent)
 *
 * **Desktop/PhoneTop:**
 * - Load child apps as modules via `loadAppBuilder()` → same process
 * - Child apps share the launcher's `App` instance
 * - Apps call their builder function (not main())
 * - Services are injected via constructor (IoC pattern)
 * - When child app window closes → launcher continues running
 *
 * ### Shutdown Strategies
 *
 * Because launchers spawn separate processes, child applications can use `standaloneShutdownStrategy`
 * without worrying about terminating the parent process. Each spawned process has its own lifecycle.
 *
 * Usage:
 * ```typescript
 * import { createAppLauncher, app, resolveTransport } from 'tsyne';
 *
 * app(resolveTransport(), { title: 'My Launcher' },
 *   createAppLauncher('My Launcher', __dirname, {
 *     extension: '.ts',
 *     exclude: ['index.ts'],
 *     buttonFormat: '▶ {name}'
 *   })
 * );
 * ```
 */

import type { App } from './app';
import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import { isBrowserMode, getBrowserPageContext } from './tsyne-window';
import { parseAnsi } from './ansi-parser';

export interface AppFilePattern {
  /** Glob pattern to match files (e.g., '*.ts', '*.test.ts') */
  pattern: string;
  /** Display name for this category (e.g., 'Examples', 'Tests') */
  label: string;
  /** Format string for button text (e.g., '▶ {name}') */
  buttonFormat: string;
  /** Command to execute (e.g., 'npx', 'npm') */
  command: string;
  /** Arguments to pass (e.g., ['tsx', '{filepath}']) - {filepath} replaced with full path */
  args: string[];
  /** Optional: pattern to exclude (e.g., '*.test.ts' to exclude test files) */
  excludePattern?: string;
  /** If true, capture stdout/stderr and display in a window with ANSI colors */
  captureOutput?: boolean;
  /** URL template to open in default browser. {name} is replaced with the base name.
   *  When set, command/args are ignored. */
  openUrl?: string;
}

export interface LauncherOptions {
  /** File patterns to discover and launch */
  patterns?: AppFilePattern[];
  /** Files to exclude (e.g., ['index.ts', 'index.test.ts']) - defaults to ['index.ts', 'index.test.ts'] */
  exclude?: string[];
  /** Instructions to show at the bottom */
  instructions?: string;
}

/**
 * Open a URL in the default web browser (cross-platform).
 */
function openInBrowser(url: string) {
  const cmd = process.platform === 'darwin' ? 'open' :
              process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} ${JSON.stringify(url)}`);
}

/**
 * Launch a command and display its output in a TextGrid window with ANSI colors.
 */
function launchWithCapture(
  a: App,
  name: string,
  command: string,
  args: string[],
  cwd: string,
  onExit?: () => void
) {
  const child = spawn(command, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  let accumulated = '';
  let grid: any = null;
  let updateTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleUpdate = () => {
    if (updateTimer) return;
    updateTimer = setTimeout(async () => {
      updateTimer = null;
      if (!grid) return;
      const parsed = parseAnsi(accumulated);
      await grid.setText(parsed.plainText);
      for (const range of parsed.ranges) {
        await grid.setStyleRange(
          range.startRow, range.startCol,
          range.endRow, range.endCol,
          range.style
        );
      }
    }, 50);
  };

  const onData = (chunk: Buffer) => {
    accumulated += chunk.toString();
    scheduleUpdate();
  };

  child.stdout?.on('data', onData);
  child.stderr?.on('data', onData);

  child.on('error', (error) => {
    accumulated += `\n\x1b[31mError: ${error.message}\x1b[0m\n`;
    scheduleUpdate();
    onExit?.();
  });

  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      accumulated += `\n\x1b[33mProcess exited with code ${code}\x1b[0m\n`;
    }
    scheduleUpdate();
    onExit?.();
  });

  a.window({ title: `${name} - Output`, width: 900, height: 600 }, (win: any) => {
    win.setContent(() => {
      a.scroll(() => {
        grid = a.textgrid({ text: 'Running...\n' });
      });
    });
    win.show();
  });
}

/**
 * Create a launcher app that discovers and launches applications from a directory
 *
 * @param title - Window title and display name
 * @param directory - Directory to scan for apps
 * @param options - Configuration options
 * @returns Builder function to pass to app()
 *
 * @example
 * ```typescript
 * // Simple: just launch .ts files with npx tsx
 * const launcher = createAppLauncher('Examples', __dirname, {
 *   patterns: [{
 *     pattern: '*.ts',
 *     label: 'Examples',
 *     buttonFormat: '▶ {name}',
 *     command: 'npx',
 *     args: ['tsx', '{filepath}']
 *   }]
 * });
 *
 * // Advanced: launch both examples and tests with different executors
 * const launcher = createAppLauncher('Examples', __dirname, {
 *   patterns: [
 *     {
 *       pattern: '*.ts',
 *       label: 'Examples',
 *       buttonFormat: '▶ {name}',
 *       command: 'npx',
 *       args: ['tsx', '{filepath}']
 *     },
 *     {
 *       pattern: '*.test.ts',
 *       label: 'Tests',
 *       buttonFormat: '🧪 {name}',
 *       command: 'npm',
 *       args: ['test', '--', '{filepath}']
 *     }
 *   ],
 *   exclude: ['index.ts', 'index.test.ts']
 * });
 * ```
 */
export function createAppLauncher(
  title: string,
  directory: string,
  options: LauncherOptions = {}
) {
  const defaultPatterns: AppFilePattern[] = [
    {
      pattern: '*.ts',
      label: 'Apps',
      buttonFormat: '▶ {name}',
      command: 'npx',
      args: ['tsx', '{filepath}']
    }
  ];

  const {
    patterns = defaultPatterns,
    exclude = ['index.ts', 'index.test.ts'],
    instructions = 'Click any app to launch in a new window.'
  } = options;

  return (a: App): void => {
    // Discover all apps and collect base names (without any extension)
    const allFiles = fs.readdirSync(directory);
    const baseNames = new Set<string>();

    // Sort patterns by specificity (longest extension first) for proper matching
    const sortedPatterns = [...patterns].sort((a, b) => {
      const extA = a.pattern.replace('*', '').length;
      const extB = b.pattern.replace('*', '').length;
      return extB - extA; // longest first
    });

    for (const file of allFiles) {
      if (exclude.includes(file)) continue;

      // Extract base name by removing the longest matching extension
      for (const pattern of sortedPatterns) {
        const ext = pattern.pattern.replace('*', '');
        if (file.endsWith(ext)) {
          const baseName = file.slice(0, -ext.length); // Remove extension
          baseNames.add(baseName);
          break;
        }
      }
    }

    // Sort base names
    const sortedNames = Array.from(baseNames).sort();

    // Build entries with all patterns for each base name
    const sortedEntries = sortedNames.map(baseName => ({
      baseName,
      actions: patterns
        .map(pattern => {
          const ext = pattern.pattern.replace('*', '');
          const fileName = baseName + ext;
          const filePath = path.join(directory, fileName);
          return { pattern, file: fileName, filePath };
        })
        .filter(action => {
          // If pattern has an excludePattern, check if this file matches it
          if (action.pattern.excludePattern) {
            const excludeExt = action.pattern.excludePattern.replace('*', '');
            if (action.file.endsWith(excludeExt)) {
              return false; // exclude this file
            }
          }
          return true;
        })
    }));

    const runningApps = new Set<string>();

    const buildContent = () => {
      a.border({
        top: () => {
          a.vbox(() => {
            a.label('Apps').when(() => sortedEntries.length > 0);
            a.separator();
          });
        },
        center: () => {
          a.scroll(() => {
            a.vbox(() => {
              // Render one row per app entry with action buttons
              for (const entry of sortedEntries) {
                a.hbox(() => {
                  // App name takes up available space
                  a.label(entry.baseName).withId(`app-label-${entry.baseName}`);
                  a.spacer();

                  // Create handler with proper closure
                  const makeClickHandler = (name: string, filePath: string, pat: AppFilePattern) => {
                    return async () => {
                      // Open URL in browser instead of spawning
                      if (pat.openUrl) {
                        openInBrowser(pat.openUrl.replace('{name}', name));
                        return;
                      }

                      // Check if file exists
                      if (!fs.existsSync(filePath)) {
                        console.error(`File not found: ${path.basename(filePath)}`);
                        return;
                      }

                      // In browser mode, navigate to file:// URL instead of spawning
                      if (isBrowserMode()) {
                        const browserCtx = getBrowserPageContext();
                        if (browserCtx?.changePage) {
                          await browserCtx.changePage(`file://${filePath}`);
                          return;
                        }
                      }

                      // Prevent launching same app multiple times
                      const key = `${name}-${pat.label}`;
                      if (runningApps.has(key)) {
                        return;
                      }

                      runningApps.add(key);

                      try {
                        // Use relative path (just filename) instead of full path
                        const fileName = path.basename(filePath);
                        const args = pat.args.map(arg => arg.replace('{filepath}', fileName));

                        if (pat.captureOutput) {
                          launchWithCapture(a, name, pat.command, args, directory, () => {
                            runningApps.delete(key);
                          });
                        } else {
                          const child = spawn(pat.command, args, {
                            cwd: directory,
                            stdio: ['ignore', 'inherit', 'inherit'],
                            detached: false
                          });

                          child.on('error', (error) => {
                            console.error(`Failed to launch ${name}:`, error);
                            runningApps.delete(key);
                          });

                          child.on('exit', (code) => {
                            runningApps.delete(key);
                          });
                        }
                      } catch (error) {
                        console.error(`Exception spawning ${name}:`, error);
                        runningApps.delete(key);
                      }
                    };
                  };

                  // Show action buttons for each pattern
                  for (const action of entry.actions) {
                    const buttonText = action.pattern.buttonFormat.replace('{name}', '');
                    a.button(buttonText, { onClick: makeClickHandler(entry.baseName, action.filePath, action.pattern) })
                      .withId(`app-btn-${entry.baseName}-${action.pattern.label}`);
                  }
                });
              }
            });
          });
        },
        bottom: () => {
          a.vbox(() => {
            a.separator();
            a.label('No apps found in this directory').when(() => sortedEntries.length === 0);
            a.label(instructions).when(() => sortedEntries.length > 0);
          });
        }
      });
    };

    // In browser mode, output a flat list (browser provides scroll + window)
    if (isBrowserMode()) {
      // Capture context now — it won't be available at click time
      const capturedCtx = getBrowserPageContext();
      a.label('Apps').when(() => sortedEntries.length > 0);
      if (sortedEntries.length > 0) a.separator();
      for (const entry of sortedEntries) {
        a.hbox(() => {
          a.label(entry.baseName).withId(`app-label-${entry.baseName}`);
          a.spacer();
          for (const action of entry.actions) {
            const buttonText = action.pattern.buttonFormat.replace('{name}', '');
            const filePath = action.filePath;
            const pat = action.pattern;
            const name = entry.baseName;
            a.button(buttonText, { onClick: async () => {
              if (pat.openUrl) {
                openInBrowser(pat.openUrl.replace('{name}', name));
                return;
              }
              if (!fs.existsSync(filePath)) {
                console.error(`File not found: ${path.basename(filePath)}`);
                return;
              }
              const fileName = path.basename(filePath);
              const args = pat.args.map(arg => arg.replace('{filepath}', fileName));
              if (pat.captureOutput) {
                launchWithCapture(a, name, pat.command, args, directory);
              } else {
                spawn(pat.command, args, {
                  cwd: directory,
                  stdio: ['ignore', 'inherit', 'inherit'],
                  detached: false
                });
              }
            } }).withId(`app-btn-${name}-${pat.label}`);
          }
        });
      }
      a.separator();
      a.label('No apps found in this directory').when(() => sortedEntries.length === 0);
      a.label(instructions).when(() => sortedEntries.length > 0);
      return;
    }

    // Standalone mode: create a window and build content into it
    a.window({ title, width: 600, height: 600 }, (win: any) => {
      win.setContent(() => {
        buildContent();
      });
      win.show();
    });
  };
}
