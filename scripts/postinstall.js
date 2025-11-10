#!/usr/bin/env node

/**
 * Post-install script for Tsyne
 *
 * This script runs after npm install and does the following:
 * 1. Detects the current platform (OS + architecture)
 * 2. Copies the appropriate pre-built binary to bin/tsyne-bridge
 * 3. Makes it executable (on Unix systems)
 *
 * If no pre-built binary is found, it falls back to building from source
 * (requires Go 1.21+)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const platform = process.platform;
const arch = process.arch;

// Map Node.js platform/arch to our binary naming
function getBinaryName() {
  const mapping = {
    'darwin-x64': 'tsyne-bridge-darwin-amd64',
    'darwin-arm64': 'tsyne-bridge-darwin-arm64',
    'linux-x64': 'tsyne-bridge-linux-amd64',
    'win32-x64': 'tsyne-bridge-windows-amd64.exe',
  };

  const key = `${platform}-${arch}`;
  return mapping[key];
}

function selectPrebuiltBinary() {
  const binaryName = getBinaryName();

  if (!binaryName) {
    console.log(`No pre-built binary for ${platform}-${arch}`);
    return false;
  }

  const binDir = path.join(__dirname, '..', 'bin');
  const sourcePath = path.join(binDir, binaryName);
  const targetName = platform === 'win32' ? 'tsyne-bridge.exe' : 'tsyne-bridge';
  const targetPath = path.join(binDir, targetName);

  if (!fs.existsSync(sourcePath)) {
    console.log(`Pre-built binary not found: ${binaryName}`);
    return false;
  }

  try {
    // Create bin directory if it doesn't exist
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    // Copy the binary
    fs.copyFileSync(sourcePath, targetPath);

    // Make executable on Unix
    if (platform !== 'win32') {
      fs.chmodSync(targetPath, 0o755);
    }

    console.log(`✓ Installed Tsyne bridge for ${platform}-${arch}`);
    return true;
  } catch (err) {
    console.error(`Failed to copy binary: ${err.message}`);
    return false;
  }
}

function findGoBinary() {
  // Common Go installation paths
  const goPaths = [
    'go', // Check PATH first
    '/usr/local/go/bin/go',
    '/usr/bin/go',
    process.env.HOME + '/go/bin/go',
    'C:\\Go\\bin\\go.exe',
    'C:\\Program Files\\Go\\bin\\go.exe',
  ];

  for (const goPath of goPaths) {
    try {
      execSync(`${goPath} version`, { stdio: 'ignore' });
      return goPath;
    } catch (err) {
      continue;
    }
  }

  return null;
}

function buildFromSource() {
  console.log('Attempting to build Tsyne bridge from source...');

  const goBinary = findGoBinary();

  if (!goBinary) {
    console.error('');
    console.error('ERROR: Go is not installed or not in PATH');
    console.error('');
    console.error('To use Tsyne, you need either:');
    console.error('  1. A supported platform with pre-built binaries (macOS, Linux, Windows x64)');
    console.error('  2. Go 1.21+ installed to build from source');
    console.error('');
    console.error('Install Go from: https://go.dev/dl/');
    console.error('');
    process.exit(1);
  }

  try {
    console.log('Building Tsyne bridge from source (this may take a minute)...');
    console.log('Running: ' + goBinary + ' build -v');

    const buildCmd = platform === 'win32'
      ? `cd bridge && ${goBinary} build -v -o ..\\bin\\tsyne-bridge.exe`
      : `cd bridge && ${goBinary} build -v -o ../bin/tsyne-bridge`;

    execSync(buildCmd, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    console.log('✓ Built Tsyne bridge from source');
    return true;
  } catch (err) {
    console.error('');
    console.error('ERROR: Failed to build Tsyne bridge from source');
    console.error('');
    console.error('This may be due to missing platform dependencies.');
    console.error('On Linux, you may need: libgl1-mesa-dev xorg-dev');
    console.error('On macOS, you may need: Xcode Command Line Tools');
    console.error('On Windows, you may need: MinGW-w64 for CGO');
    console.error('');
    process.exit(1);
  }
}

// Main installation logic
function install() {
  console.log('Installing Tsyne...');

  // Try pre-built binary first
  if (selectPrebuiltBinary()) {
    return;
  }

  // Fall back to building from source
  console.log('');
  console.log('No pre-built binary available for your platform.');
  buildFromSource();
}

// Run installation
try {
  install();
} catch (err) {
  console.error('');
  console.error('ERROR: Tsyne installation failed');
  console.error(err.message);
  console.error('');
  process.exit(1);
}
