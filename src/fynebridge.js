"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BridgeConnection = void 0;
var child_process_1 = require("child_process");
var path = require("path");
var crc32 = require("buffer-crc32");
var BridgeConnection = /** @class */ (function () {
    function BridgeConnection(testMode) {
        if (testMode === void 0) { testMode = false; }
        var _this = this;
        this.messageId = 0;
        this.pendingRequests = new Map();
        this.eventHandlers = new Map();
        this.buffer = Buffer.alloc(0); // Accumulate incoming data
        this.readingFrame = false;
        // Detect if running from pkg
        var isPkg = typeof process.pkg !== 'undefined';
        var bridgePath;
        if (isPkg) {
            // When running from pkg, look for bridge next to the executable
            var execDir = path.dirname(process.execPath);
            bridgePath = path.join(execDir, 'tsyne-bridge');
        }
        else {
            // Find project root by detecting if running from compiled code or ts-node
            // __dirname could be either dist/src (compiled) or src (ts-node)
            var isCompiled = __dirname.includes(path.sep + 'dist' + path.sep);
            var projectRoot = isCompiled
                ? path.join(__dirname, '..', '..') // dist/src -> up 2 levels
                : path.join(__dirname, '..'); // src -> up 1 level
            bridgePath = path.join(projectRoot, 'bin', 'tsyne-bridge');
        }
        var args = testMode ? ['--headless'] : [];
        this.process = (0, child_process_1.spawn)(bridgePath, args, {
            stdio: ['pipe', 'pipe', 'inherit']
        });
        // Create promise that resolves when bridge is ready
        this.readyPromise = new Promise(function (resolve) {
            _this.readyResolve = resolve;
        });
        // IPC Safeguard: Read framed messages with length-prefix and CRC32 validation
        // Frame format: [uint32 length][uint32 crc32][json bytes]
        this.process.stdout.on('data', function (chunk) {
            // Accumulate data in buffer
            _this.buffer = Buffer.concat([_this.buffer, chunk]);
            // Try to read complete frames
            while (_this.tryReadFrame()) {
                // Keep reading frames until buffer is exhausted
            }
        });
        this.process.on('error', function (err) {
            console.error('Bridge process error:', err);
        });
        this.process.on('exit', function (code) {
            // Only log non-zero exit codes (errors)
            if (code !== 0) {
                console.error("Bridge process exited with code ".concat(code));
            }
        });
    }
    /**
     * Try to read one complete framed message from the buffer
     * Returns true if a message was read, false if more data is needed
     */
    BridgeConnection.prototype.tryReadFrame = function () {
        // Need at least 8 bytes for length + crc32
        if (this.buffer.length < 8) {
            return false;
        }
        // Read length prefix (4 bytes, big-endian)
        var length = this.buffer.readUInt32BE(0);
        // Sanity check: reject unreasonably large messages (> 10MB)
        if (length > 10 * 1024 * 1024) {
            console.error("Message too large: ".concat(length, " bytes"));
            // Skip the corrupt frame by discarding buffer
            this.buffer = Buffer.alloc(0);
            return false;
        }
        // Check if we have the complete frame
        var frameSize = 8 + length; // 4 bytes length + 4 bytes crc32 + payload
        if (this.buffer.length < frameSize) {
            return false; // Wait for more data
        }
        // Read CRC32 checksum (4 bytes, big-endian)
        var expectedChecksum = this.buffer.readUInt32BE(4);
        // Read JSON payload
        var payload = this.buffer.slice(8, 8 + length);
        // Validate CRC32 checksum
        var actualChecksum = crc32.unsigned(payload);
        if (actualChecksum !== expectedChecksum) {
            console.error("Checksum mismatch: expected ".concat(expectedChecksum, ", got ").concat(actualChecksum));
            // Try to recover by skipping this frame
            this.buffer = this.buffer.slice(frameSize);
            return false;
        }
        // Parse JSON message
        try {
            var jsonString = payload.toString('utf8');
            var data = JSON.parse(jsonString);
            // Distinguish between Event (has 'type') and Response (has 'id')
            // Events have a 'type' field but no 'id' field
            // Responses have an 'id' field but no 'type' field
            if ('type' in data && !('id' in data)) {
                // This is an event
                this.handleEvent(data);
            }
            else {
                // This is a response
                this.handleResponse(data);
            }
        }
        catch (err) {
            console.error('Error parsing bridge message:', err);
        }
        // Remove the frame from buffer
        this.buffer = this.buffer.slice(frameSize);
        return true; // Successfully read a frame
    };
    BridgeConnection.prototype.handleResponse = function (response) {
        // Handle ready signal
        if (response.id === 'ready' && this.readyResolve) {
            this.readyResolve();
            return;
        }
        var pending = this.pendingRequests.get(response.id);
        if (pending) {
            this.pendingRequests.delete(response.id);
            if (response.success) {
                pending.resolve(response.result || {});
            }
            else {
                pending.reject(new Error(response.error || 'Unknown error'));
            }
        }
    };
    BridgeConnection.prototype.handleEvent = function (event) {
        var _a;
        if (event.type === 'callback' && ((_a = event.data) === null || _a === void 0 ? void 0 : _a.callbackId)) {
            var handler = this.eventHandlers.get(event.data.callbackId);
            if (handler) {
                handler(event.data);
            }
        }
        else {
            // Handle other event types (e.g., hyperlinkNavigation)
            var handler = this.eventHandlers.get(event.type);
            if (handler) {
                handler(event.data);
            }
        }
    };
    /**
     * Wait for the bridge to be ready to receive commands
     */
    BridgeConnection.prototype.waitUntilReady = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.readyPromise];
            });
        });
    };
    BridgeConnection.prototype.send = function (type, payload) {
        return __awaiter(this, void 0, void 0, function () {
            var id, message;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                    // Wait for bridge to be ready before sending commands
                    return [4 /*yield*/, this.readyPromise];
                    case 1:
                        // Wait for bridge to be ready before sending commands
                        _a.sent();
                        id = "msg_".concat(this.messageId++);
                        message = { id: id, type: type, payload: payload };
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                _this.pendingRequests.set(id, { resolve: resolve, reject: reject });
                                // IPC Safeguard: Write framed message with length-prefix and CRC32 validation
                                // Frame format: [uint32 length][uint32 crc32][json bytes]
                                var jsonBuffer = Buffer.from(JSON.stringify(message), 'utf8');
                                var checksum = crc32.unsigned(jsonBuffer);
                                // Create frame buffer: length (4 bytes) + crc32 (4 bytes) + json
                                var frame = Buffer.alloc(8 + jsonBuffer.length);
                                frame.writeUInt32BE(jsonBuffer.length, 0); // Write length
                                frame.writeUInt32BE(checksum, 4); // Write CRC32
                                jsonBuffer.copy(frame, 8); // Copy JSON payload
                                _this.process.stdin.write(frame);
                            })];
                }
            });
        });
    };
    BridgeConnection.prototype.registerEventHandler = function (callbackId, handler) {
        this.eventHandlers.set(callbackId, handler);
    };
    BridgeConnection.prototype.registerCustomId = function (widgetId, customId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.send('registerCustomId', { widgetId: widgetId, customId: customId })];
            });
        });
    };
    BridgeConnection.prototype.getParent = function (widgetId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.send('getParent', { widgetId: widgetId })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.parentId];
                }
            });
        });
    };
    BridgeConnection.prototype.quit = function () {
        var _this = this;
        this.send('quit', {});
        setTimeout(function () {
            if (!_this.process.killed) {
                _this.process.kill();
            }
        }, 1000);
    };
    return BridgeConnection;
}());
exports.BridgeConnection = BridgeConnection;
