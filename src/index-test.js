"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expect = exports.Locator = exports.TestContext = exports.describe = exports.test = exports.TsyneTest = void 0;
// Export testing utilities
var tsyne_test_1 = require("./tsyne-test");
Object.defineProperty(exports, "TsyneTest", { enumerable: true, get: function () { return tsyne_test_1.TsyneTest; } });
Object.defineProperty(exports, "test", { enumerable: true, get: function () { return tsyne_test_1.test; } });
Object.defineProperty(exports, "describe", { enumerable: true, get: function () { return tsyne_test_1.describe; } });
var test_1 = require("./test");
Object.defineProperty(exports, "TestContext", { enumerable: true, get: function () { return test_1.TestContext; } });
Object.defineProperty(exports, "Locator", { enumerable: true, get: function () { return test_1.Locator; } });
Object.defineProperty(exports, "Expect", { enumerable: true, get: function () { return test_1.Expect; } });
// Re-export main Tsyne API for convenience
__exportStar(require("./index"), exports);
