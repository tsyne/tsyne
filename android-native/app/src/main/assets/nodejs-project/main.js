// Phonetop main.js - Android entry point
const fs = require('fs');
const path = require('path');

// TextDecoder polyfill for Node.js without ICU support
// The 'fatal' option isn't supported, so we wrap TextDecoder to ignore it
const OriginalTextDecoder = global.TextDecoder;
global.TextDecoder = class TextDecoderPolyfill {
    constructor(encoding = 'utf-8', options = {}) {
        // Strip 'fatal' option which isn't supported without ICU
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

console.log('[Node.js] Starting Phonetop on Android');
console.log('[Node.js] Process version:', process.version);
console.log('[Node.js] Platform:', process.platform);
console.log('[Node.js] __dirname:', __dirname);

// Set environment for msgpack-uds transport
process.env.TSYNE_BRIDGE_MODE = 'msgpack-uds';

// Read bridge config to get socket path
const configPath = path.join(__dirname, 'bridge-config.json');
console.log('[Node.js] Looking for config at:', configPath);

function tryReadConfig(attempts = 0) {
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            process.env.TSYNE_SOCKET_PATH = config.socketPath;
            console.log('[Node.js] Socket path:', config.socketPath);
            startPhoneTOp();
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

async function startPhoneTOp() {
    try {
        console.log('[Node.js] Loading phonetop bundle...');
        const phonetop = require('./phonetop-bundle.js');

        console.log('[Node.js] Bundle loaded, exports:', Object.keys(phonetop));

        // The bundle should export app() and buildPhoneTopAndroid (for static apps)
        if (phonetop.app && phonetop.buildPhoneTopAndroid) {
            console.log('[Node.js] Starting PhoneTop app with static apps...');
            phonetop.app('msgpack-uds', { title: 'PhoneTop' }, async (a) => {
                console.log('[Node.js] App instance created, building UI with static apps...');
                // Use buildPhoneTopAndroid which has all apps statically bundled
                await phonetop.buildPhoneTopAndroid(a, {
                    baseDirectory: __dirname
                });
                console.log('[Node.js] PhoneTop UI built with static apps!');
            });
        } else if (phonetop.app && phonetop.buildPhoneTop) {
            // Fallback to dynamic scanning (won't find apps on Android)
            console.log('[Node.js] Fallback: Starting PhoneTop app with dynamic scanning...');
            phonetop.app('msgpack-uds', { title: 'PhoneTop' }, async (a) => {
                await phonetop.buildPhoneTop(a, { baseDirectory: __dirname });
            });
        } else {
            console.error('[Node.js] Bundle missing required exports');
            console.log('[Node.js] Available exports:', JSON.stringify(Object.keys(phonetop)));
        }
    } catch (err) {
        console.error('[Node.js] Failed to start PhoneTop:', err.message);
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
