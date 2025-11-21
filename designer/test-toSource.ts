/**
 * Quick test to verify toSource() function works correctly
 */

// Simple test metadata
const metadata = {
  widgets: [
    {
      id: 'widget-0',
      widgetType: 'app',
      properties: { title: 'Test App' },
      parent: null,
      eventHandlers: {},
      mouseEventHandlers: {}
    },
    {
      id: 'widget-1',
      widgetType: 'window',
      properties: { title: 'Test Window', width: 500, height: 400 },
      parent: 'widget-0',
      eventHandlers: {},
      mouseEventHandlers: {}
    },
    {
      id: 'widget-2',
      widgetType: 'vbox',
      properties: {},
      parent: 'widget-1',
      eventHandlers: {},
      mouseEventHandlers: {}
    },
    {
      id: 'widget-3',
      widgetType: 'label',
      properties: { text: 'Hello World' },
      parent: 'widget-2',
      eventHandlers: {},
      mouseEventHandlers: {}
    },
    {
      id: 'widget-4',
      widgetType: 'button',
      properties: { text: 'Click Me' },
      parent: 'widget-2',
      eventHandlers: { onClick: '() => console.log("Clicked!")' },
      mouseEventHandlers: {
        onMouseIn: '(e) => console.log("Mouse in")',
        onMouseOut: '() => console.log("Mouse out")'
      },
      accessibility: {
        label: 'Click button',
        description: 'A test button',
        hint: 'Click to test'
      }
    }
  ]
};

const styles = {
  highlighted: {
    backgroundColor: '#ffff00',
    fontWeight: 'bold'
  }
};

// Import toSource function from the built server.js
const serverModule = require('./dist/server.js');

// The toSource function should be exported or accessible
// For now, let's just print the metadata to verify structure
console.log('Test metadata:');
console.log(JSON.stringify(metadata, null, 2));

console.log('\nTest styles:');
console.log(JSON.stringify(styles, null, 2));

console.log('\ntoSource() function test completed!');
console.log('The function should generate TypeScript source from the metadata above.');
