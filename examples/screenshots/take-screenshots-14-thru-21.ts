#!/usr/bin/env npx ts-node
/**
 * Screenshot capture script for Interactive Apps (examples 14-21)
 *
 * Usage:
 *   npx ts-node examples/screenshots/take-screenshots-14-thru-21.ts
 *
 * Or via npm script:
 *   npm run test:screenshots:interactive
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

const examples = [
  '14-color-mixer',
  '15-tip-calculator',
  '16-password-generator',
  '17-stopwatch',
  '18-dice-roller',
  '19-bmi-calculator',
  '20-rock-paper-scissors',
  '21-quiz-app'
];

const rootDir = findProjectRoot(__dirname);

console.log('Taking screenshots for Interactive Apps (14-21)...\n');

for (const example of examples) {
  const testFile = `examples/${example}.test.ts`;
  console.log(`📷 ${example}...`);

  try {
    execSync(
      `TSYNE_HEADED=1 TAKE_SCREENSHOTS=1 npx jest ${testFile} --testNamePattern="should display" --runInBand`,
      { cwd: rootDir, stdio: 'inherit' }
    );
  } catch (error) {
    console.error(`   Failed: ${example}`);
  }
}

console.log('\nDone! Screenshots saved to examples/screenshots/');
