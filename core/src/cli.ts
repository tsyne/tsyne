#!/usr/bin/env node
/**
 * Tsyne CLI
 *
 * Usage:
 *   tsyne <app.ts>            # Infers 'run'
 *   tsyne run <app.ts>        # Run an app
 *   tsyne dev <app.ts>        # Hot reload, inspector, debugging
 *   tsyne build <app.ts>      # Package for distribution
 *   tsyne test                # Run tests
 *   tsyne --version           # Report all component versions
 */

import { PROTOCOL_VERSION, TSYNE_VERSION } from './version';
import { spawn, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(msg: string): void {
  console.log(`${colors.blue}[tsyne]${colors.reset} ${msg}`);
}

function logError(msg: string): void {
  console.error(`${colors.red}[tsyne]${colors.reset} ${msg}`);
}

/**
 * Get the bridge version by querying the bridge binary
 */
function getBridgeVersion(): { version: string; protocol: number } | null {
  const bridgePath = process.env.TSYNE_BRIDGE_PATH || findBridgePath();
  if (!bridgePath || !fs.existsSync(bridgePath)) {
    return null;
  }

  // For now, return the version from our constants
  // In future, we could query the bridge directly
  return {
    version: TSYNE_VERSION, // Bridge version matches package version
    protocol: PROTOCOL_VERSION,
  };
}

/**
 * Find the bridge binary path
 */
function findBridgePath(): string | null {
  // Check common locations
  const candidates = [
    // Dev mode: relative to this file
    path.join(__dirname, '..', 'bin', 'tsyne-bridge'),
    path.join(__dirname, '..', '..', 'bin', 'tsyne-bridge'),
    // Installed mode
    path.join(__dirname, '..', '..', '..', 'bin', 'tsyne-bridge'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Get Node.js version
 */
function getNodeVersion(): string {
  return process.version.replace(/^v/, '');
}

/**
 * Print version information for all components
 */
function printVersion(): void {
  console.log(`tsyne ${TSYNE_VERSION}`);

  const bridge = getBridgeVersion();
  if (bridge) {
    console.log(`  bridge: ${bridge.version} (protocol v${bridge.protocol})`);
  } else {
    console.log(`  bridge: not found`);
  }

  console.log(`  node: ${getNodeVersion()}`);
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
Usage: tsyne [command] [options] [file]

Commands:
  run <app.ts>      Run a Tsyne application
  dev <app.ts>      Run with hot reload and debugging (coming soon)
  build <app.ts>    Package for distribution (coming soon)
  test              Run tests (coming soon)

Options:
  --version, -v     Show version information
  --help, -h        Show this help message

Examples:
  tsyne app.ts              Run app.ts (infers 'run' command)
  tsyne run app.ts          Explicitly run app.ts
  tsyne --version           Show all component versions
`);
}

/**
 * Run a Tsyne application
 */
async function runApp(appPath: string, args: string[]): Promise<number> {
  // Resolve absolute path
  const absolutePath = path.resolve(appPath);

  if (!fs.existsSync(absolutePath)) {
    logError(`File not found: ${appPath}`);
    return 1;
  }

  // Find tsx for running TypeScript
  const tsxPaths = [
    path.join(__dirname, '..', '..', '..', 'node_modules', '.bin', 'tsx'),
    path.join(__dirname, '..', '..', 'node_modules', '.bin', 'tsx'),
    path.join(__dirname, '..', 'node_modules', '.bin', 'tsx'),
  ];

  let tsxPath: string | null = null;
  for (const p of tsxPaths) {
    if (fs.existsSync(p)) {
      tsxPath = p;
      break;
    }
  }

  if (!tsxPath) {
    // Fall back to npx
    log('Running with npx tsx...');
    const result = spawn('npx', ['tsx', absolutePath, ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        TSYNE_BRIDGE_PATH: findBridgePath() || undefined,
      },
    });

    return new Promise((resolve) => {
      result.on('close', (code) => resolve(code || 0));
    });
  }

  log(`Running ${path.basename(appPath)}...`);

  const result = spawn(tsxPath, [absolutePath, ...args], {
    stdio: 'inherit',
    env: {
      ...process.env,
      TSYNE_BRIDGE_PATH: findBridgePath() || undefined,
    },
  });

  return new Promise((resolve) => {
    result.on('close', (code) => resolve(code || 0));
  });
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const firstArg = args[0];

  // Handle flags
  if (firstArg === '--version' || firstArg === '-v') {
    printVersion();
    process.exit(0);
  }

  if (firstArg === '--help' || firstArg === '-h') {
    printUsage();
    process.exit(0);
  }

  // Handle commands
  let command: string;
  let appPath: string | undefined;
  let appArgs: string[];

  if (firstArg === 'run' || firstArg === 'dev' || firstArg === 'build' || firstArg === 'test') {
    command = firstArg;
    appPath = args[1];
    appArgs = args.slice(2);
  } else if (firstArg.endsWith('.ts') || firstArg.endsWith('.tsx')) {
    // Infer 'run' command when given a .ts file directly
    command = 'run';
    appPath = firstArg;
    appArgs = args.slice(1);
  } else {
    logError(`Unknown command: ${firstArg}`);
    printUsage();
    process.exit(1);
  }

  switch (command) {
    case 'run':
      if (!appPath) {
        logError('No application file specified');
        printUsage();
        process.exit(1);
      }
      const exitCode = await runApp(appPath, appArgs);
      process.exit(exitCode);
      break;

    case 'dev':
      logError('dev command coming soon');
      process.exit(1);
      break;

    case 'build':
      logError('build command coming soon');
      process.exit(1);
      break;

    case 'test':
      logError('test command coming soon');
      process.exit(1);
      break;

    default:
      logError(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  logError(err.message);
  process.exit(1);
});
