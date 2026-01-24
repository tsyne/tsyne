// Standalone 3D Cube main.js - Android entry point for debugging
const fs = require('fs');
const path = require('path');

// TextDecoder polyfill for Node.js without ICU support
const OriginalTextDecoder = global.TextDecoder;
global.TextDecoder = class TextDecoderPolyfill {
    constructor(encoding = 'utf-8', options = {}) {
        const { fatal, ...safeOptions } = options;
        if (fatal) {
            console.log('[Node.js] TextDecoder: ignoring unsupported "fatal" option');
        }
        this._decoder = new OriginalTextDecoder(encoding, safeOptions);
    }
    decode(input, options) {
        return this._decoder.decode(input, options);
    }
    get encoding() { return this._decoder.encoding; }
    get fatal() { return false; }
    get ignoreBOM() { return this._decoder.ignoreBOM; }
};

console.log('[Node.js] Starting standalone 3D Cube on Android');
console.log('[Node.js] Process version:', process.version);
console.log('[Node.js] Platform:', process.platform);
console.log('[Node.js] __dirname:', __dirname);

// Set environment for msgpack-uds transport
process.env.TSYNE_BRIDGE_MODE = 'msgpack-uds';

// Set debug token for remote control API
process.env.TSYNE_DEBUG_TOKEN = 'tsyne-dev-token-j5';

// Read bridge config to get socket path
const configPath = path.join(__dirname, 'bridge-config.json');
console.log('[Node.js] Looking for config at:', configPath);

function tryReadConfig(attempts = 0) {
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            process.env.TSYNE_SOCKET_PATH = config.socketPath;
            console.log('[Node.js] Socket path:', config.socketPath);
            start3DCube();
        } else {
            if (attempts < 10) {
                console.log('[Node.js] Config not found, retrying... (attempt ' + (attempts + 1) + ')');
                setTimeout(() => tryReadConfig(attempts + 1), 500);
            } else {
                console.error('[Node.js] Config file not found after 10 attempts');
            }
        }
    } catch (err) {
        console.error('[Node.js] Error reading config:', err.message);
        if (attempts < 10) {
            setTimeout(() => tryReadConfig(attempts + 1), 500);
        }
    }
}

async function start3DCube() {
    try {
        console.log('[Node.js] Loading 3d-cube bundle...');
        const cube = require('./3dcube-bundle.js');

        console.log('[Node.js] Bundle loaded, exports:', Object.keys(cube));

        if (cube.app && cube.start3DCube) {
            console.log('[Node.js] Starting 3D Cube app...');
            cube.app('msgpack-uds', { title: '3D Cube' }, async (a) => {
                console.log('[Node.js] App instance created, building UI...');
                await cube.start3DCube(a);
                console.log('[Node.js] 3D Cube ready!');
            });
        } else {
            console.error('[Node.js] Bundle missing required exports');
            console.log('[Node.js] Available exports:', JSON.stringify(Object.keys(cube)));
        }
    } catch (err) {
        console.error('[Node.js] Failed to start 3D Cube:', err.message);
        console.error(err.stack);
    }
}

// Start looking for config
setTimeout(() => tryReadConfig(), 100);

// Keep process alive
setInterval(() => {
    console.log('[Node.js] Heartbeat:', new Date().toISOString());
}, 30000);

console.log('[Node.js] Main script initialized');
