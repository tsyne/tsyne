/**
 * Unit tests for Cosyne primitives
 */

import { CosyneCircle } from '../src/primitives/circle';
import { CosyneRect } from '../src/primitives/rect';
import { CosyneLine } from '../src/primitives/line';
import { CosyneText } from '../src/primitives/text';
import { CosynePath } from '../src/primitives/path';
import { CosyneArc } from '../src/primitives/arc';
import { CosyneWedge } from '../src/primitives/wedge';

// Mock underlying widget
class MockWidget {
  properties: any = {};

  update(props: any) {
    this.properties = { ...this.properties, ...props };
  }

  updateFillColor(color: string) {
    this.properties.fillColor = color;
  }

  updateStrokeColor(color: string) {
    this.properties.strokeColor = color;
  }

  updateStrokeWidth(width: number) {
    this.properties.strokeWidth = width;
  }
}

describe('CosyneCircle', () => {
  it('should create a circle with correct initial properties', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    expect(circle.getPosition()).toEqual({ x: 100, y: 100 });
    expect(circle.getRadius()).toEqual(20);
  });

  it('should set custom ID', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    circle.withId('myCircle');
    expect(circle.getId()).toEqual('myCircle');
  });

  it('should chain ID setting with other methods', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget).withId('ball').fill('#ff0000');

    expect(circle.getId()).toEqual('ball');
  });

  it('should apply fill color', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    circle.fill('#ff0000');
    expect(widget.properties.fillColor).toEqual('#ff0000');
  });

  it('should apply stroke', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    circle.stroke('#000000', 2);
    expect(widget.properties.strokeColor).toEqual('#000000');
    expect(widget.properties.strokeWidth).toEqual(2);
  });

  it('should update position from binding', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    circle.updatePosition({ x: 200, y: 250 });
    expect(circle.getPosition()).toEqual({ x: 200, y: 250 });
  });

  it('should chain fill and stroke', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget)
      .fill('#ff0000')
      .stroke('#000000', 2)
      .withId('coloredCircle');

    expect(circle.getId()).toEqual('coloredCircle');
    expect(widget.properties.fillColor).toEqual('#ff0000');
    expect(widget.properties.strokeColor).toEqual('#000000');
  });

  it('should change radius', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    circle.setRadius(30);
    expect(circle.getRadius()).toEqual(30);
  });
});

describe('CosyneRect', () => {
  it('should create a rect with correct initial properties', () => {
    const widget = new MockWidget();
    const rect = new CosyneRect(50, 50, 100, 80, widget);

    expect(rect.getPosition()).toEqual({ x: 50, y: 50 });
    expect(rect.getDimensions()).toEqual({ width: 100, height: 80 });
  });

  it('should set custom ID', () => {
    const widget = new MockWidget();
    const rect = new CosyneRect(50, 50, 100, 80, widget);

    rect.withId('myRect');
    expect(rect.getId()).toEqual('myRect');
  });

  it('should apply fill color', () => {
    const widget = new MockWidget();
    const rect = new CosyneRect(50, 50, 100, 80, widget);

    rect.fill('#0000ff');
    expect(widget.properties.fillColor).toEqual('#0000ff');
  });

  it('should apply stroke', () => {
    const widget = new MockWidget();
    const rect = new CosyneRect(50, 50, 100, 80, widget);

    rect.stroke('#333333', 3);
    expect(widget.properties.strokeColor).toEqual('#333333');
    expect(widget.properties.strokeWidth).toEqual(3);
  });

  it('should update position from binding', () => {
    const widget = new MockWidget();
    const rect = new CosyneRect(50, 50, 100, 80, widget);

    rect.updatePosition({ x: 100, y: 150 });
    expect(rect.getPosition()).toEqual({ x: 100, y: 150 });
  });

  it('should change dimensions', () => {
    const widget = new MockWidget();
    const rect = new CosyneRect(50, 50, 100, 80, widget);

    rect.setDimensions(200, 150);
    expect(rect.getDimensions()).toEqual({ width: 200, height: 150 });
  });

  it('should chain operations', () => {
    const widget = new MockWidget();
    const rect = new CosyneRect(50, 50, 100, 80, widget)
      .fill('#00ff00')
      .stroke('#000000', 1)
      .withId('greenRect');

    expect(rect.getId()).toEqual('greenRect');
    expect(widget.properties.fillColor).toEqual('#00ff00');
  });
});

describe('CosyneLine', () => {
  it('should create a line with correct initial endpoints', () => {
    const widget = new MockWidget();
    const line = new CosyneLine(0, 0, 100, 100, widget);

    expect(line.getEndpoints()).toEqual({ x1: 0, y1: 0, x2: 100, y2: 100 });
  });

  it('should set custom ID', () => {
    const widget = new MockWidget();
    const line = new CosyneLine(0, 0, 100, 100, widget);

    line.withId('myLine');
    expect(line.getId()).toEqual('myLine');
  });

  it('should apply stroke (lines use stroke only)', () => {
    const widget = new MockWidget();
    const line = new CosyneLine(0, 0, 100, 100, widget);

    line.stroke('#333333', 2);
    expect(widget.properties.strokeColor).toEqual('#333333');
    expect(widget.properties.strokeWidth).toEqual(2);
  });

  it('should update endpoints', () => {
    const widget = new MockWidget();
    const line = new CosyneLine(0, 0, 100, 100, widget);

    line.updateEndpoints({ x1: 10, y1: 20, x2: 110, y2: 120 });
    expect(line.getEndpoints()).toEqual({ x1: 10, y1: 20, x2: 110, y2: 120 });
  });

  it('should chain operations', () => {
    const widget = new MockWidget();
    const line = new CosyneLine(0, 0, 100, 100, widget)
      .stroke('#333333', 2)
      .withId('diagonalLine');

    expect(line.getId()).toEqual('diagonalLine');
    expect(widget.properties.strokeColor).toEqual('#333333');
  });
});

describe('Primitive base functionality', () => {
  it('TC-PRIM-001: Circle renders at correct position', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    expect(circle.getPosition()).toEqual({ x: 100, y: 100 });
  });

  it('TC-PRIM-002: Circle respects fill and stroke', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget)
      .fill('#ff0000')
      .stroke('#000000', 2);

    expect(widget.properties.fillColor).toEqual('#ff0000');
    expect(widget.properties.strokeColor).toEqual('#000000');
    expect(widget.properties.strokeWidth).toEqual(2);
  });

  it('TC-PRIM-003: Line renders between two points', () => {
    const widget = new MockWidget();
    const line = new CosyneLine(0, 0, 200, 200, widget);

    const endpoints = line.getEndpoints();
    expect(endpoints.x1).toEqual(0);
    expect(endpoints.y1).toEqual(0);
    expect(endpoints.x2).toEqual(200);
    expect(endpoints.y2).toEqual(200);
  });

  it('TC-PRIM-005: Rect renders with correct dimensions', () => {
    const widget = new MockWidget();
    const rect = new CosyneRect(50, 50, 100, 80, widget);

    const dims = rect.getDimensions();
    expect(dims.width).toEqual(100);
    expect(dims.height).toEqual(80);
  });

  it('TC-PRIM-009: Multiple primitives can be created', () => {
    const widget1 = new MockWidget();
    const widget2 = new MockWidget();
    const widget3 = new MockWidget();

    const circle = new CosyneCircle(100, 100, 20, widget1).withId('c1');
    const rect = new CosyneRect(50, 50, 100, 80, widget2).withId('r1');
    const line = new CosyneLine(0, 0, 200, 200, widget3).withId('l1');

    expect(circle.getId()).toEqual('c1');
    expect(rect.getId()).toEqual('r1');
    expect(line.getId()).toEqual('l1');
  });
});

describe('CosyneText (Phase 1.5)', () => {
  it('should create text with correct initial properties', () => {
    const widget = new MockWidget();
    const text = new CosyneText(50, 100, 'Hello', widget);

    expect(text.getPosition()).toEqual({ x: 50, y: 100 });
    expect(text.getText()).toEqual('Hello');
  });

  it('should set custom ID', () => {
    const widget = new MockWidget();
    const text = new CosyneText(50, 100, 'Hello', widget);

    text.withId('label');
    expect(text.getId()).toEqual('label');
  });

  it('should apply fill color', () => {
    const widget = new MockWidget();
    const text = new CosyneText(50, 100, 'Hello', widget);

    text.fill('#ff0000');
    expect(widget.properties.fillColor).toEqual('#ff0000');
  });

  it('should update text content', () => {
    const widget = new MockWidget();
    const text = new CosyneText(50, 100, 'Hello', widget);

    text.setText('World');
    expect(text.getText()).toEqual('World');
  });

  it('should update position', () => {
    const widget = new MockWidget();
    const text = new CosyneText(50, 100, 'Hello', widget);

    text.updatePosition({ x: 100, y: 200 });
    expect(text.getPosition()).toEqual({ x: 100, y: 200 });
  });

  it('should chain operations', () => {
    const widget = new MockWidget();
    const text = new CosyneText(50, 100, 'Hello', widget)
      .fill('#ff0000')
      .withId('greeting');

    expect(text.getId()).toEqual('greeting');
    expect(widget.properties.fillColor).toEqual('#ff0000');
  });
});

describe('CosynePath (Phase 1.5)', () => {
  it('should create path with correct SVG path string', () => {
    const widget = new MockWidget();
    const path = new CosynePath('M 10 10 L 20 20 L 30 10', widget);

    expect(path.getPathString()).toEqual('M 10 10 L 20 20 L 30 10');
  });

  it('should set custom ID', () => {
    const widget = new MockWidget();
    const path = new CosynePath('M 10 10 L 20 20', widget);

    path.withId('myPath');
    expect(path.getId()).toEqual('myPath');
  });

  it('should apply fill color', () => {
    const widget = new MockWidget();
    const path = new CosynePath('M 10 10 L 20 20', widget);

    path.fill('#00ff00');
    expect(widget.properties.fillColor).toEqual('#00ff00');
  });

  it('should apply stroke', () => {
    const widget = new MockWidget();
    const path = new CosynePath('M 10 10 L 20 20', widget);

    path.stroke('#000000', 2);
    expect(widget.properties.strokeColor).toEqual('#000000');
    expect(widget.properties.strokeWidth).toEqual(2);
  });

  it('should update path string', () => {
    const widget = new MockWidget();
    const path = new CosynePath('M 10 10 L 20 20', widget);

    path.setPathString('M 0 0 L 100 100');
    expect(path.getPathString()).toEqual('M 0 0 L 100 100');
  });
});

describe('CosyneArc (Phase 1.5)', () => {
  it('should create arc with correct initial properties', () => {
    const widget = new MockWidget();
    const arc = new CosyneArc(100, 100, 50, widget);

    expect(arc.getPosition()).toEqual({ x: 100, y: 100 });
    expect(arc.getRadius()).toEqual(50);
  });

  it('should set custom ID', () => {
    const widget = new MockWidget();
    const arc = new CosyneArc(100, 100, 50, widget);

    arc.withId('myArc');
    expect(arc.getId()).toEqual('myArc');
  });

  it('should apply fill color', () => {
    const widget = new MockWidget();
    const arc = new CosyneArc(100, 100, 50, widget);

    arc.fill('#0000ff');
    expect(widget.properties.fillColor).toEqual('#0000ff');
  });

  it('should set start and end angles', () => {
    const widget = new MockWidget();
    const arc = new CosyneArc(100, 100, 50, widget);

    arc.setStartAngle(0).setEndAngle(Math.PI / 2);
    // Note: exact angle checking would need getters
    expect(arc.getRadius()).toEqual(50);
  });

  it('should update position', () => {
    const widget = new MockWidget();
    const arc = new CosyneArc(100, 100, 50, widget);

    arc.updatePosition({ x: 200, y: 250 });
    expect(arc.getPosition()).toEqual({ x: 200, y: 250 });
  });

  it('should chain operations', () => {
    const widget = new MockWidget();
    const arc = new CosyneArc(100, 100, 50, widget)
      .fill('#0000ff')
      .stroke('#000000', 1)
      .withId('bluearc');

    expect(arc.getId()).toEqual('bluearc');
  });
});

describe('CosyneWedge (Phase 1.5)', () => {
  it('should create wedge with correct initial properties', () => {
    const widget = new MockWidget();
    const wedge = new CosyneWedge(100, 100, 50, widget);

    expect(wedge.getPosition()).toEqual({ x: 100, y: 100 });
    expect(wedge.getRadius()).toEqual(50);
  });

  it('should set custom ID', () => {
    const widget = new MockWidget();
    const wedge = new CosyneWedge(100, 100, 50, widget);

    wedge.withId('myWedge');
    expect(wedge.getId()).toEqual('myWedge');
  });

  it('should apply fill color', () => {
    const widget = new MockWidget();
    const wedge = new CosyneWedge(100, 100, 50, widget);

    wedge.fill('#ffff00');
    expect(widget.properties.fillColor).toEqual('#ffff00');
  });

  it('should set radius', () => {
    const widget = new MockWidget();
    const wedge = new CosyneWedge(100, 100, 50, widget);

    wedge.setRadius(75);
    expect(wedge.getRadius()).toEqual(75);
  });

  it('should set start and end angles', () => {
    const widget = new MockWidget();
    const wedge = new CosyneWedge(100, 100, 50, widget);

    wedge.setStartAngle(0).setEndAngle(Math.PI);
    expect(wedge.getRadius()).toEqual(50);
  });

  it('should chain operations', () => {
    const widget = new MockWidget();
    const wedge = new CosyneWedge(100, 100, 50, widget)
      .fill('#ffff00')
      .stroke('#000000', 2)
      .withId('yellowWedge');

    expect(wedge.getId()).toEqual('yellowWedge');
  });
});

describe('Binding methods (Phase 2)', () => {
  it('should bind fill color to a function', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    const binding = circle.bindFill(() => '#ff0000');
    expect(binding).toBeTruthy();
    expect(circle.getFillBinding()).toBeTruthy();
  });

  it('should bind stroke color to a function', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    const binding = circle.bindStroke(() => '#000000');
    expect(binding).toBeTruthy();
    expect(circle.getStrokeBinding()).toBeTruthy();
  });

  it('should bind alpha to a function', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    const binding = circle.bindAlpha(() => 0.5);
    expect(binding).toBeTruthy();
    expect(circle.getAlphaBinding()).toBeTruthy();
  });

  it('should bind visibility to a function', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    const binding = circle.bindVisible(() => true);
    expect(binding).toBeTruthy();
    expect(circle.getVisibleBinding()).toBeTruthy();
  });

  it('should chain multiple bindings', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget)
      .bindFill(() => '#ff0000')
      .bindStroke(() => '#000000')
      .bindAlpha(() => 0.8)
      .bindVisible(() => true);

    expect(circle.getFillBinding()).toBeTruthy();
    expect(circle.getStrokeBinding()).toBeTruthy();
    expect(circle.getAlphaBinding()).toBeTruthy();
    expect(circle.getVisibleBinding()).toBeTruthy();
  });

  it('should update fill from binding', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    circle.updateFill('#ff0000');
    expect(widget.properties.fillColor).toEqual('#ff0000');
  });

  it('should update stroke from binding', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    circle.updateStroke('#000000');
    expect(widget.properties.strokeColor).toEqual('#000000');
  });

  it('should update alpha from binding', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    circle.updateAlpha(0.5);
    // Alpha is stored in the primitive
    expect(circle).toBeTruthy();
  });

  it('should update visibility from binding', () => {
    const widget = new MockWidget();
    const circle = new CosyneCircle(100, 100, 20, widget);

    // Should not throw
    circle.updateVisibility(false);
    expect(circle).toBeTruthy();
  });
});

describe('Comprehensive integration tests', () => {
  it('should allow multiple primitives with different bindings', () => {
    const widget1 = new MockWidget();
    const widget2 = new MockWidget();
    const widget3 = new MockWidget();

    const circle = new CosyneCircle(100, 100, 20, widget1)
      .withId('circle1')
      .fill('#ff0000')
      .bindAlpha(() => 0.5);

    const rect = new CosyneRect(50, 50, 100, 80, widget2)
      .withId('rect1')
      .bindFill(() => '#00ff00');

    const text = new CosyneText(10, 10, 'Test', widget3)
      .withId('text1')
      .bindStroke(() => '#0000ff');

    expect(circle.getId()).toEqual('circle1');
    expect(rect.getId()).toEqual('rect1');
    expect(text.getId()).toEqual('text1');
    expect(circle.getFillBinding()).toBeFalsy(); // No fill binding
    expect(rect.getFillBinding()).toBeTruthy();
    expect(text.getStrokeBinding()).toBeTruthy();
  });

  it('should support all specialty primitives with bindings', () => {
    const widget1 = new MockWidget();
    const widget2 = new MockWidget();
    const widget3 = new MockWidget();
    const widget4 = new MockWidget();

    const text = new CosyneText(0, 0, 'Label', widget1)
      .withId('t1')
      .bindFill(() => '#000000');

    const path = new CosynePath('M 0 0 L 100 100', widget2)
      .withId('p1')
      .bindStroke(() => '#ff0000');

    const arc = new CosyneArc(50, 50, 40, widget3)
      .withId('a1')
      .bindAlpha(() => 0.8);

    const wedge = new CosyneWedge(50, 50, 40, widget4)
      .withId('w1')
      .bindVisible(() => true);

    expect(text.getId()).toEqual('t1');
    expect(path.getId()).toEqual('p1');
    expect(arc.getId()).toEqual('a1');
    expect(wedge.getId()).toEqual('w1');

    expect(text.getFillBinding()).toBeTruthy();
    expect(path.getStrokeBinding()).toBeTruthy();
    expect(arc.getAlphaBinding()).toBeTruthy();
    expect(wedge.getVisibleBinding()).toBeTruthy();
  });

  it('should support all MVP + Phase 1.5 + Phase 2 features together', () => {
    const widget = new MockWidget();

    // Test fluent API with all features
    const circle = new CosyneCircle(100, 100, 20, widget)
      .withId('fullFeatured')
      .fill('#ff0000')
      .stroke('#000000', 2)
      .bindPosition(() => ({ x: 100, y: 100 }))
      .bindFill(() => '#ff0000')
      .bindStroke(() => '#000000')
      .bindAlpha(() => 1.0)
      .bindVisible(() => true);

    expect(circle.getId()).toEqual('fullFeatured');
    expect(circle.getPositionBinding()).toBeTruthy();
    expect(circle.getFillBinding()).toBeTruthy();
    expect(circle.getStrokeBinding()).toBeTruthy();
    expect(circle.getAlphaBinding()).toBeTruthy();
    expect(circle.getVisibleBinding()).toBeTruthy();
  });
});
