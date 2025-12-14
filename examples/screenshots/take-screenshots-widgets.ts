#!/usr/bin/env npx tsx
/**
 * Screenshot capture for widget demo scripts
 *
 * Usage:
 *   npx tsx examples/screenshots/take-screenshots-widgets.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Find project root by looking for package.json
function findProjectRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== '/') {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error('Could not find project root (no package.json found)');
}

// Widget demos with screenshot support
const examples = [
  'counter',
  'hello',
  'checkbox',
  'slider',
  'radiogroup',
  'select',
];

const rootDir = findProjectRoot(__dirname);

console.log('Taking screenshots for widget demos...\n');

for (const example of examples) {
  const scriptPath = `examples/${example}.ts`;
  console.log(`📷 ${example}...`);

  try {
    execSync(
      `timeout 8 npx tsx ${scriptPath} --screenshot`,
      { cwd: rootDir, stdio: 'inherit' }
    );
  } catch (error) {
    // timeout is expected when screenshot is taken
  }
}

console.log('\nDone! Screenshots saved to examples/screenshots/');
