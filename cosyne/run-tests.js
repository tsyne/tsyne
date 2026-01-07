/**
 * Simple test runner for Cosyne MVP
 * Validates core functionality without requiring Jest
 */

const { CosyneContext } = require('./dist/context');
const { Binding, BindingRegistry } = require('./dist/binding');
const { CosyneCircle } = require('./dist/primitives/circle');
const { CosyneRect } = require('./dist/primitives/rect');
const { CosyneLine } = require('./dist/primitives/line');

// Color codes for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let testCount = 0;
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function test(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passCount++;
  } catch (e) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.log(`  ${e.message}`);
    failCount++;
  }
}

// Mock widget
class MockWidget {
  properties = {};
  update(props) {
    this.properties = { ...this.properties, ...props };
  }
  updateFillColor(color) {
    this.properties.fillColor = color;
  }
  updateStrokeColor(color) {
    this.properties.strokeColor = color;
  }
  updateStrokeWidth(width) {
    this.properties.strokeWidth = width;
  }
}

// Mock app
class MockApp {
  canvasCircle(props) {
    return new MockWidget();
  }
  canvasRectangle(props) {
    return new MockWidget();
  }
  canvasLine(x1, y1, x2, y2, opts) {
    return new MockWidget();
  }
}

console.log('Cosyne MVP Test Suite\n');

// Test Binding
test('Binding: should store and evaluate a function', () => {
  let value = 10;
  const binding = new Binding(() => value);

  const result = binding.evaluate();
  assertEqual(result, 10, 'Initial value');

  value = 20;
  const result2 = binding.evaluate();
  assertEqual(result2, 20, 'Updated value');
});

test('Binding: should track last evaluated value', () => {
  const binding = new Binding(() => 42);

  assert(binding.getLastValue() === undefined, 'Should be undefined before eval');
  binding.evaluate();
  assertEqual(binding.getLastValue(), 42, 'Should track value after eval');
});

// Test BindingRegistry
test('BindingRegistry: should register bindings', () => {
  const registry = new BindingRegistry();
  const binding1 = new Binding(() => 1);
  const binding2 = new Binding(() => 2);

  registry.register(binding1);
  registry.register(binding2);

  assertEqual(registry.count(), 2, 'Should have 2 bindings');
});

test('BindingRegistry: should refresh all bindings', () => {
  const registry = new BindingRegistry();
  let value1 = 10;
  let value2 = 20;

  const binding1 = new Binding(() => value1);
  const binding2 = new Binding(() => value2);

  registry.register(binding1);
  registry.register(binding2);

  registry.refreshAll();

  assertEqual(binding1.getLastValue(), 10, 'Binding1 should evaluate to 10');
  assertEqual(binding2.getLastValue(), 20, 'Binding2 should evaluate to 20');
});

// Test Circle
test('CosyneCircle: should create circle with correct properties', () => {
  const widget = new MockWidget();
  const circle = new CosyneCircle(100, 100, 20, widget);

  assertEqual(circle.getPosition(), { x: 100, y: 100 }, 'Position should match');
  assertEqual(circle.getRadius(), 20, 'Radius should match');
});

test('CosyneCircle: should set custom ID', () => {
  const widget = new MockWidget();
  const circle = new CosyneCircle(100, 100, 20, widget);

  circle.withId('myCircle');
  assertEqual(circle.getId(), 'myCircle', 'ID should be set');
});

test('CosyneCircle: should apply fill color', () => {
  const widget = new MockWidget();
  const circle = new CosyneCircle(100, 100, 20, widget);

  circle.fill('#ff0000');
  assertEqual(widget.properties.fillColor, '#ff0000', 'Fill color should be applied');
});

test('CosyneCircle: should apply stroke', () => {
  const widget = new MockWidget();
  const circle = new CosyneCircle(100, 100, 20, widget);

  circle.stroke('#000000', 2);
  assertEqual(widget.properties.strokeColor, '#000000', 'Stroke color should match');
  assertEqual(widget.properties.strokeWidth, 2, 'Stroke width should match');
});

test('CosyneCircle: should update position from binding', () => {
  const widget = new MockWidget();
  const circle = new CosyneCircle(100, 100, 20, widget);

  circle.updatePosition({ x: 200, y: 250 });
  assertEqual(circle.getPosition(), { x: 200, y: 250 }, 'Position should update');
});

test('CosyneCircle: should chain methods', () => {
  const widget = new MockWidget();
  const circle = new CosyneCircle(100, 100, 20, widget)
    .fill('#ff0000')
    .stroke('#000000', 2)
    .withId('coloredCircle');

  assertEqual(circle.getId(), 'coloredCircle', 'ID should be set');
  assertEqual(widget.properties.fillColor, '#ff0000', 'Fill should be applied');
  assertEqual(widget.properties.strokeColor, '#000000', 'Stroke should be applied');
});

// Test Rectangle
test('CosyneRect: should create rect with correct properties', () => {
  const widget = new MockWidget();
  const rect = new CosyneRect(50, 50, 100, 80, widget);

  assertEqual(rect.getPosition(), { x: 50, y: 50 }, 'Position should match');
  assertEqual(rect.getDimensions(), { width: 100, height: 80 }, 'Dimensions should match');
});

test('CosyneRect: should apply fill color', () => {
  const widget = new MockWidget();
  const rect = new CosyneRect(50, 50, 100, 80, widget);

  rect.fill('#0000ff');
  assertEqual(widget.properties.fillColor, '#0000ff', 'Fill color should be applied');
});

test('CosyneRect: should update position', () => {
  const widget = new MockWidget();
  const rect = new CosyneRect(50, 50, 100, 80, widget);

  rect.updatePosition({ x: 100, y: 150 });
  assertEqual(rect.getPosition(), { x: 100, y: 150 }, 'Position should update');
});

// Test Line
test('CosyneLine: should create line with correct endpoints', () => {
  const widget = new MockWidget();
  const line = new CosyneLine(0, 0, 100, 100, widget);

  assertEqual(line.getEndpoints(), { x1: 0, y1: 0, x2: 100, y2: 100 }, 'Endpoints should match');
});

test('CosyneLine: should apply stroke', () => {
  const widget = new MockWidget();
  const line = new CosyneLine(0, 0, 100, 100, widget);

  line.stroke('#333333', 2);
  assertEqual(widget.properties.strokeColor, '#333333', 'Stroke color should be applied');
  assertEqual(widget.properties.strokeWidth, 2, 'Stroke width should match');
});

test('CosyneLine: should update endpoints', () => {
  const widget = new MockWidget();
  const line = new CosyneLine(0, 0, 100, 100, widget);

  line.updateEndpoints({ x1: 10, y1: 20, x2: 110, y2: 120 });
  assertEqual(line.getEndpoints(), { x1: 10, y1: 20, x2: 110, y2: 120 }, 'Endpoints should update');
});

// Test CosyneContext
test('CosyneContext: should create circle', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  const circle = ctx.circle(100, 100, 20).withId('ball');
  assertEqual(circle.getId(), 'ball', 'Circle ID should be set');
});

test('CosyneContext: should create rect', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  const rect = ctx.rect(50, 50, 100, 80).withId('box');
  assertEqual(rect.getId(), 'box', 'Rect ID should be set');
});

test('CosyneContext: should create line', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  const line = ctx.line(0, 0, 100, 100).withId('diagonal');
  assertEqual(line.getId(), 'diagonal', 'Line ID should be set');
});

test('CosyneContext: should track primitives by ID', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  const circle = ctx.circle(100, 100, 20).withId('myCircle');
  assertEqual(ctx.getPrimitiveById('myCircle'), circle, 'Should track by ID');
});

test('CosyneContext: should refresh position binding', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  let x = 100;
  let y = 100;

  const circle = ctx.circle(x, y, 20).withId('ball').bindPosition(() => ({ x, y }));

  assertEqual(circle.getPosition(), { x: 100, y: 100 }, 'Initial position should match');

  x = 200;
  y = 250;
  ctx.refreshBindings();

  assertEqual(circle.getPosition(), { x: 200, y: 250 }, 'Position should update after refresh');
});

test('CosyneContext: should refresh line endpoint binding', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  let x1 = 0;
  let y1 = 0;
  let x2 = 100;
  let y2 = 100;

  const line = ctx.line(x1, y1, x2, y2).withId('diagonal').bindEndpoint(() => ({
    x1,
    y1,
    x2,
    y2,
  }));

  assertEqual(line.getEndpoints(), { x1: 0, y1: 0, x2: 100, y2: 100 }, 'Initial endpoints should match');

  x1 = 50;
  y1 = 50;
  x2 = 150;
  y2 = 150;
  ctx.refreshBindings();

  assertEqual(line.getEndpoints(), { x1: 50, y1: 50, x2: 150, y2: 150 }, 'Endpoints should update after refresh');
});

test('CosyneContext: should manage multiple bindings', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  let pos1 = { x: 100, y: 100 };
  let pos2 = { x: 200, y: 200 };

  const circle1 = ctx.circle(0, 0, 20).withId('c1').bindPosition(() => pos1);
  const circle2 = ctx.circle(0, 0, 20).withId('c2').bindPosition(() => pos2);

  ctx.refreshBindings();

  assertEqual(circle1.getPosition(), { x: 100, y: 100 }, 'Circle1 should have position 1');
  assertEqual(circle2.getPosition(), { x: 200, y: 200 }, 'Circle2 should have position 2');

  pos1 = { x: 300, y: 300 };
  pos2 = { x: 400, y: 400 };

  ctx.refreshBindings();

  assertEqual(circle1.getPosition(), { x: 300, y: 300 }, 'Circle1 should update');
  assertEqual(circle2.getPosition(), { x: 400, y: 400 }, 'Circle2 should update');
});

test('CosyneContext: should get all primitives', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  ctx.circle(100, 100, 20).withId('c1');
  ctx.rect(50, 50, 100, 80).withId('r1');
  ctx.line(0, 0, 100, 100).withId('l1');

  const all = ctx.getAllPrimitives();
  assertEqual(all.length, 3, 'Should have 3 primitives');
});

test('CosyneContext: should clear all primitives', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  ctx.circle(100, 100, 20).withId('c1');
  ctx.rect(50, 50, 100, 80).withId('r1');

  assertEqual(ctx.getAllPrimitives().length, 2, 'Should have 2 primitives');

  ctx.clear();

  assertEqual(ctx.getAllPrimitives().length, 0, 'Should have 0 primitives after clear');
  assert(ctx.getPrimitiveById('c1') === undefined, 'Should not find primitive after clear');
});

// Test MVP Acceptance Criteria
console.log('\nMVP Acceptance Criteria:');

test('MVP-1: cosyne() creates a context', () => {
  const app = new MockApp();
  const { cosyne } = require('./dist/context');

  let contextCreated = false;
  cosyne(app, (c) => {
    contextCreated = true;
    assert(c instanceof CosyneContext, 'Context should be CosyneContext instance');
  });

  assert(contextCreated, 'Builder function should be called');
});

test('MVP-2: rect() and circle() create Fyne canvas primitives', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  const rect = ctx.rect(0, 0, 400, 400);
  const circle = ctx.circle(100, 100, 20);

  assert(rect instanceof CosyneRect, 'rect() should return CosyneRect');
  assert(circle instanceof CosyneCircle, 'circle() should return CosyneCircle');
});

test('MVP-3: fill() and stroke() set colors', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  const rect = ctx.rect(0, 0, 400, 400).fill('#E8E8E8');
  const circle = ctx.circle(100, 100, 20).fill('#ff0000').stroke('#000000', 2);

  assert(rect.getUnderlying().properties.fillColor === '#E8E8E8', 'fill() should set color');
  assert(circle.getUnderlying().properties.fillColor === '#ff0000', 'fill() should set color on circle');
  assert(circle.getUnderlying().properties.strokeColor === '#000000', 'stroke() should set color');
});

test('MVP-4: withId() assigns IDs for TsyneTest lookup', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  const ball = ctx.circle(100, 100, 10).withId('ball');

  assertEqual(ball.getId(), 'ball', 'ID should be set');
  assertEqual(ctx.getPrimitiveById('ball'), ball, 'Should be retrievable by ID');
});

test('MVP-5: bindPosition() stores a function', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  const state = { x: 0, y: 0 };
  const circle = ctx.circle(0, 0, 10).bindPosition(() => state);

  assert(circle.getPositionBinding() !== undefined, 'bindPosition() should register binding');
});

test('MVP-6: refreshBindings() re-evaluates all bindings', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  let state = { x: 0, y: 0 };
  const circle = ctx.circle(0, 0, 10).bindPosition(() => state);

  state = { x: 100, y: 100 };
  ctx.refreshBindings();

  assertEqual(circle.getPosition(), { x: 100, y: 100 }, 'refreshBindings() should update position');
});

test('MVP-7: Primitives support basic TsyneTest lookup', () => {
  const app = new MockApp();
  const ctx = new CosyneContext(app);

  const ball = ctx.circle(100, 100, 10).withId('ball');

  const retrieved = ctx.getPrimitiveById('ball');
  assert(retrieved === ball, 'Should retrieve primitive by ID for testing');
  assert(retrieved instanceof CosyneCircle, 'Retrieved primitive should have correct type');
});

// Print summary
console.log(`\n${'─'.repeat(50)}`);
console.log(`Tests: ${testCount} | ${GREEN}Passed: ${passCount}${RESET} | ${RED}Failed: ${failCount}${RESET}`);

if (failCount === 0) {
  console.log(`${GREEN}All MVP acceptance criteria passed!${RESET}`);
  process.exit(0);
} else {
  console.log(`${RED}Some tests failed${RESET}`);
  process.exit(1);
}
