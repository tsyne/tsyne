"use strict";
/**
 * Test script for Tsyne Designer proof of concept
 * This demonstrates loading a file, capturing metadata, and editing properties
 */
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
// Parse stack trace to get source location
function parseStackTrace(stack) {
    var lines = stack.split('\n');
    for (var i = 2; i < lines.length; i++) {
        var line = lines[i];
        var match = line.match(/\((.+):(\d+):(\d+)\)/);
        if (match && !match[1].includes('node_modules') && !match[1].includes('test-designer')) {
            return {
                file: match[1],
                line: parseInt(match[2], 10),
                column: parseInt(match[3], 10)
            };
        }
    }
    return null;
}
// Metadata store
var metadataStore = new Map();
var currentParent = null;
var widgetIdCounter = 0;
// Designer functions that capture metadata
function captureWidget(type, props) {
    var widgetId = "widget-".concat(widgetIdCounter++);
    var stack = new Error().stack || '';
    var location = parseStackTrace(stack);
    var metadata = {
        widgetId: widgetId,
        widgetType: type,
        sourceLocation: location || { file: 'unknown', line: 0, column: 0 },
        properties: props,
        parent: currentParent
    };
    metadataStore.set(widgetId, metadata);
    return widgetId;
}
// Designer API
var designer = {
    app: function (options, builder) {
        console.log('Designer: Loading app...');
        builder(designer);
    },
    window: function (options, builder) {
        var widgetId = captureWidget('window', options);
        builder(designer);
    },
    vbox: function (builder) {
        var widgetId = captureWidget('vbox', {});
        var prevParent = currentParent;
        currentParent = widgetId;
        builder();
        currentParent = prevParent;
    },
    hbox: function (builder) {
        var widgetId = captureWidget('hbox', {});
        var prevParent = currentParent;
        currentParent = widgetId;
        builder();
        currentParent = prevParent;
    },
    label: function (text) {
        captureWidget('label', { text: text });
    },
    button: function (text, onClick) {
        captureWidget('button', { text: text, onClick: onClick === null || onClick === void 0 ? void 0 : onClick.toString() });
    }
};
// Source code editor
var SourceCodeEditor = /** @class */ (function () {
    function SourceCodeEditor(filePath) {
        this.filePath = filePath;
        this.lines = fs.readFileSync(filePath, 'utf8').split('\n');
    }
    SourceCodeEditor.prototype.updateProperty = function (metadata, property, newValue) {
        var _a = metadata.sourceLocation, line = _a.line, column = _a.column;
        if (line === 0 || line > this.lines.length) {
            return false;
        }
        var lineIndex = line - 1;
        var lineContent = this.lines[lineIndex];
        var afterColumn = lineContent.substring(column);
        // Find first string literal
        var match = afterColumn.match(/(['"])((?:(?!\1).)*)\1/);
        if (match) {
            var quote = match[1];
            var startIndex = column + afterColumn.indexOf(match[0]);
            var endIndex = startIndex + match[0].length;
            this.lines[lineIndex] =
                lineContent.substring(0, startIndex) +
                    "".concat(quote).concat(newValue).concat(quote) +
                    lineContent.substring(endIndex);
            return true;
        }
        return false;
    };
    SourceCodeEditor.prototype.getSourceCode = function () {
        return this.lines.join('\n');
    };
    SourceCodeEditor.prototype.save = function (outputPath) {
        fs.writeFileSync(outputPath, this.getSourceCode(), 'utf8');
    };
    return SourceCodeEditor;
}());
// Test with hello.ts
console.log('=== Tsyne Designer Proof of Concept ===\n');
// Create a modified version of hello.ts that uses our designer
var helloPath = path.join(__dirname, 'examples', 'hello.ts');
var helloSource = fs.readFileSync(helloPath, 'utf8');
console.log('Original hello.ts:');
console.log(helloSource);
console.log('\n--- Executing in design mode ---\n');
// Execute the code with designer API
metadataStore.clear();
widgetIdCounter = 0;
currentParent = null;
// Simulate executing hello.ts with designer API
designer.app({ title: "Hello Tsyne" }, function (a) {
    a.window({ title: "Hello World" }, function (w) {
        a.vbox(function () {
            a.label("Welcome to Tsyne!");
            a.label("A TypeScript wrapper for Fyne");
            a.button("Click Me", function () {
                console.log("Button clicked!");
            });
            a.button("Exit", function () {
                process.exit(0);
            });
        });
    });
});
console.log('\n--- Captured Metadata ---\n');
// Show captured metadata
metadataStore.forEach(function (metadata, id) {
    console.log("Widget: ".concat(metadata.widgetType, " (").concat(id, ")"));
    console.log("  Location: ".concat(metadata.sourceLocation.file, ":").concat(metadata.sourceLocation.line, ":").concat(metadata.sourceLocation.column));
    console.log("  Properties:", metadata.properties);
    console.log("  Parent: ".concat(metadata.parent || 'none'));
    console.log('');
});
console.log('--- Widget Tree ---\n');
function printTree(parentId, indent) {
    if (indent === void 0) { indent = ''; }
    metadataStore.forEach(function (metadata, id) {
        if (metadata.parent === parentId) {
            var props = Object.entries(metadata.properties)
                .filter(function (_a) {
                var k = _a[0];
                return k !== 'onClick';
            })
                .map(function (_a) {
                var k = _a[0], v = _a[1];
                return "".concat(k, "=\"").concat(v, "\"");
            })
                .join(' ');
            console.log("".concat(indent).concat(metadata.widgetType, " ").concat(props));
            printTree(id, indent + '  ');
        }
    });
}
printTree(null);
console.log('\n--- Source Code Editing Demo ---\n');
// Find the "Click Me" button
var clickMeButton = Array.from(metadataStore.values()).find(function (w) { return w.widgetType === 'button' && w.properties.text === 'Click Me'; });
if (clickMeButton) {
    console.log("Found button at ".concat(clickMeButton.sourceLocation.file, ":").concat(clickMeButton.sourceLocation.line, ":").concat(clickMeButton.sourceLocation.column));
    console.log("Current text: \"".concat(clickMeButton.properties.text, "\""));
    console.log('Changing to: "Press Me!"\n');
    var editor = new SourceCodeEditor(helloPath);
    var success = editor.updateProperty(clickMeButton, 'text', 'Press Me!');
    if (success) {
        var outputPath = path.join(__dirname, 'examples', 'hello.edited.ts');
        editor.save(outputPath);
        console.log("Saved edited file to: ".concat(outputPath));
        console.log('\nEdited content:');
        console.log(editor.getSourceCode());
    }
    else {
        console.log('Failed to edit property');
    }
}
console.log('\n=== Proof of Concept Complete ===');
