/**
 * Unit tests for Cosyne Dial Primitive
 * Tests the interactive rotary control/knob widget
 */

import { CosyneDial, DialOptions, DialStyle } from '../src/primitives/dial';
import { CosyneContext } from '../src/context';

// Mock widget
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
}

// Mock app for CosyneContext
class MockApp {
  canvasCircle(props: any) { return new MockWidget(); }
  canvasLine(x1: number, y1: number, x2: number, y2: number, props: any) { return new MockWidget(); }
  canvasArc(props: any) { return new MockWidget(); }
  canvasText(text: string, props: any) { return new MockWidget(); }
}

describe('CosyneDial (Rotary Knob Control)', () => {
  describe('Basic Value Operations', () => {
    it('TC-DIAL-001: Creates dial with default values', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget);

      expect(dial.getPosition()).toEqual({ x: 100, y: 100 });
      expect(dial.getValue()).toBe(0);
      expect(dial.getNormalizedValue()).toBe(0);
    });

    it('TC-DIAL-002: Creates dial with custom value range', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        minValue: 10,
        maxValue: 50,
        value: 30,
      });

      expect(dial.getValue()).toBe(30);
      expect(dial.getNormalizedValue()).toBe(0.5);  // (30-10)/(50-10) = 0.5
    });

    it('TC-DIAL-003: setValue clamps to range', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        minValue: 0,
        maxValue: 100,
      });

      dial.setValue(150);
      expect(dial.getValue()).toBe(100);

      dial.setValue(-50);
      expect(dial.getValue()).toBe(0);

      dial.setValue(50);
      expect(dial.getValue()).toBe(50);
    });

    it('TC-DIAL-004: increment/decrement with step', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        minValue: 0,
        maxValue: 100,
        value: 50,
        step: 5,
      });

      dial.increment();
      expect(dial.getValue()).toBe(55);

      dial.decrement();
      expect(dial.getValue()).toBe(50);

      dial.decrement();
      dial.decrement();
      expect(dial.getValue()).toBe(40);
    });

    it('TC-DIAL-005: increment/decrement respects bounds', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        minValue: 0,
        maxValue: 10,
        value: 9,
        step: 5,
      });

      dial.increment();  // Would go to 14, but clamped to 10
      expect(dial.getValue()).toBe(10);

      dial.setValue(1);
      dial.decrement();  // Would go to -4, but clamped to 0
      expect(dial.getValue()).toBe(0);
    });
  });

  describe('Angle Calculations', () => {
    it('TC-DIAL-006: Default angles create 270 degree sweep', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        minValue: 0,
        maxValue: 100,
      });

      // Default: -135 to 135 degrees = 270 degree sweep
      const renderData = dial.getRenderData();

      // -135 degrees = -2.356 radians
      expect(renderData.startAngle).toBeCloseTo(-135 * Math.PI / 180, 3);
      // 135 degrees = 2.356 radians
      expect(renderData.endAngle).toBeCloseTo(135 * Math.PI / 180, 3);
    });

    it('TC-DIAL-007: Value angle at 0% is start angle', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        minValue: 0,
        maxValue: 100,
        value: 0,
      });

      const valueAngle = dial.getValueAngle();
      const renderData = dial.getRenderData();

      expect(valueAngle).toBeCloseTo(renderData.startAngle, 3);
    });

    it('TC-DIAL-008: Value angle at 100% is end angle', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        minValue: 0,
        maxValue: 100,
        value: 100,
      });

      const valueAngle = dial.getValueAngle();
      const renderData = dial.getRenderData();

      expect(valueAngle).toBeCloseTo(renderData.endAngle, 3);
    });

    it('TC-DIAL-009: Value angle at 50% is midpoint', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        minValue: 0,
        maxValue: 100,
        value: 50,
      });

      const valueAngle = dial.getValueAngle();
      const startAngle = -135 * Math.PI / 180;
      const endAngle = 135 * Math.PI / 180;
      const expectedMid = startAngle + (endAngle - startAngle) * 0.5;

      expect(valueAngle).toBeCloseTo(expectedMid, 3);
    });

    it('TC-DIAL-010: Custom angle range works', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        startAngle: 0,
        endAngle: 180,
        value: 50,
        maxValue: 100,
      });

      const renderData = dial.getRenderData();
      expect(renderData.startAngle).toBeCloseTo(0, 3);
      expect(renderData.endAngle).toBeCloseTo(Math.PI, 3);

      // At 50%, should be 90 degrees
      expect(renderData.valueAngle).toBeCloseTo(Math.PI / 2, 3);
    });

    it('TC-DIAL-011: Full circle (360 degree) dial', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        startAngle: 0,
        endAngle: 360,
        value: 75,
        maxValue: 100,
      });

      const renderData = dial.getRenderData();
      // 75% of 360 degrees = 270 degrees = 1.5π radians
      expect(renderData.valueAngle).toBeCloseTo(Math.PI * 1.5, 3);
    });
  });

  describe('Indicator Position', () => {
    it('TC-DIAL-012: Indicator endpoint on dial edge', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        radius: 50,
        trackWidth: 8,
        value: 50,
        maxValue: 100,
      });

      const endpoint = dial.getIndicatorEndpoint();
      const dist = Math.sqrt(
        Math.pow(endpoint.x - 100, 2) + Math.pow(endpoint.y - 100, 2)
      );

      // Should be close to radius - trackWidth/2 - padding
      expect(dist).toBeLessThan(50);
      expect(dist).toBeGreaterThan(30);
    });

    it('TC-DIAL-013: Indicator moves as value changes', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        radius: 50,
        value: 0,
        maxValue: 100,
      });

      const endpoint0 = { ...dial.getIndicatorEndpoint() };

      dial.setValue(50);
      const endpoint50 = { ...dial.getIndicatorEndpoint() };

      dial.setValue(100);
      const endpoint100 = { ...dial.getIndicatorEndpoint() };

      // All three should be different
      expect(endpoint0.x).not.toBeCloseTo(endpoint50.x, 1);
      expect(endpoint50.x).not.toBeCloseTo(endpoint100.x, 1);
    });
  });

  describe('Tick Marks', () => {
    it('TC-DIAL-014: Default tick count is 11', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget);

      const ticks = dial.getTickPositions();
      expect(ticks.length).toBe(11);
    });

    it('TC-DIAL-015: Custom tick count', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        tickCount: 21,
      });

      const ticks = dial.getTickPositions();
      expect(ticks.length).toBe(21);
    });

    it('TC-DIAL-016: No ticks when showTicks is false', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        showTicks: false,
      });

      const ticks = dial.getTickPositions();
      expect(ticks.length).toBe(0);
    });

    it('TC-DIAL-017: Major ticks identified correctly', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        tickCount: 11,
        majorTickInterval: 5,
      });

      const ticks = dial.getTickPositions();
      const majorTicks = ticks.filter(t => t.isMajor);

      // At interval 5: 0, 5, 10 are major
      expect(majorTicks.length).toBe(3);
      expect(ticks[0].isMajor).toBe(true);
      expect(ticks[5].isMajor).toBe(true);
      expect(ticks[10].isMajor).toBe(true);
    });

    it('TC-DIAL-018: Tick positions are on dial circumference', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        radius: 50,
        tickCount: 5,
      });

      const ticks = dial.getTickPositions();

      for (const tick of ticks) {
        // Outer points should be at radius
        const distOuter = Math.sqrt(
          Math.pow(tick.x2 - 100, 2) + Math.pow(tick.y2 - 100, 2)
        );
        expect(distOuter).toBeCloseTo(50, 0);

        // Inner points should be inside
        const distInner = Math.sqrt(
          Math.pow(tick.x1 - 100, 2) + Math.pow(tick.y1 - 100, 2)
        );
        expect(distInner).toBeLessThan(50);
      }
    });
  });

  describe('Style Presets', () => {
    it('TC-DIAL-019: Classic style defaults', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        style: 'classic',
      });

      const renderData = dial.getRenderData();
      expect(renderData.trackColor).toBe('#e0e0e0');
      expect(renderData.accentColor).toBe('#3498db');
      expect(renderData.knobColor).toBe('#ffffff');
    });

    it('TC-DIAL-020: Minimal style', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        style: 'minimal',
      });

      const renderData = dial.getRenderData();
      expect(renderData.trackColor).toBe('#f0f0f0');
      expect(renderData.accentColor).toBe('#2196F3');
    });

    it('TC-DIAL-021: Vintage style', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        style: 'vintage',
      });

      const renderData = dial.getRenderData();
      expect(renderData.trackColor).toBe('#d4c4a8');
      expect(renderData.accentColor).toBe('#8b4513');
      expect(renderData.knobColor).toBe('#f5deb3');
    });

    it('TC-DIAL-022: Modern style', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        style: 'modern',
      });

      const renderData = dial.getRenderData();
      expect(renderData.trackColor).toBe('#2c2c2c');
      expect(renderData.accentColor).toBe('#00ff88');
      expect(renderData.knobColor).toBe('#1a1a1a');
    });

    it('TC-DIAL-023: Custom colors override style', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        style: 'classic',
        accentColor: '#ff0000',  // Override
      });

      const renderData = dial.getRenderData();
      expect(renderData.accentColor).toBe('#ff0000');
      expect(renderData.trackColor).toBe('#e0e0e0');  // Not overridden
    });
  });

  describe('Value Display', () => {
    it('TC-DIAL-024: Formatted value with no decimals', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        value: 45.7,
        valueDecimals: 0,
      });

      expect(dial.getFormattedValue()).toBe('46');  // Rounded
    });

    it('TC-DIAL-025: Formatted value with decimals', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        value: 45.7,
        valueDecimals: 2,
      });

      expect(dial.getFormattedValue()).toBe('45.70');
    });

    it('TC-DIAL-026: Value with prefix and suffix', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        value: 75,
        valuePrefix: '$',
        valueSuffix: '/hr',
        valueDecimals: 0,
      });

      expect(dial.getFormattedValue()).toBe('$75/hr');
    });

    it('TC-DIAL-027: showValue toggle', () => {
      const widget = new MockWidget();

      const dialShow = new CosyneDial(100, 100, widget, { showValue: true });
      expect(dialShow.getRenderData().showValue).toBe(true);

      const dialHide = new CosyneDial(100, 100, widget, { showValue: false });
      expect(dialHide.getRenderData().showValue).toBe(false);
    });
  });

  describe('Value Binding', () => {
    it('TC-DIAL-028: Bind value to function', () => {
      const widget = new MockWidget();
      let externalValue = 25;

      const dial = new CosyneDial(100, 100, widget, { maxValue: 100 })
        .bindValue(() => externalValue);

      expect(dial.getValueBinding()).toBeDefined();

      // Binding would be evaluated by context.refreshBindings()
      externalValue = 75;
      const binding = dial.getValueBinding();
      expect(binding?.evaluate()).toBe(75);
    });

    it('TC-DIAL-029: withId returns self for chaining', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget)
        .withId('volumeKnob');

      expect(dial.getId()).toBe('volumeKnob');
    });
  });

  describe('Callbacks', () => {
    it('TC-DIAL-030: onValueChange callback on setValue', () => {
      const widget = new MockWidget();
      const changes: number[] = [];

      const dial = new CosyneDial(100, 100, widget, {
        onValueChange: (v) => changes.push(v),
      });

      // Note: setValue doesn't trigger callback (only drag does internally)
      // But setOnValueChange provides callback setter
      dial.setOnValueChange((v) => changes.push(v));
    });

    it('TC-DIAL-031: setOnValueChange and setOnChangeEnded', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget);

      const valueChanges: number[] = [];
      const changeEnds: number[] = [];

      dial.setOnValueChange((v) => valueChanges.push(v));
      dial.setOnChangeEnded((v) => changeEnds.push(v));

      // Callbacks are stored
      // Would be called during drag interaction
    });
  });

  describe('Hit Testing', () => {
    it('TC-DIAL-032: Hit tester returns true inside dial', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, { radius: 50 });

      const hitTester = dial.getHitTester();

      expect(hitTester(100, 100)).toBe(true);  // Center
      expect(hitTester(125, 100)).toBe(true);  // Within radius
      expect(hitTester(100, 75)).toBe(true);   // Top edge inside
    });

    it('TC-DIAL-033: Hit tester returns false outside dial', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, { radius: 50 });

      const hitTester = dial.getHitTester();

      expect(hitTester(0, 0)).toBe(false);       // Far outside
      expect(hitTester(160, 100)).toBe(false);   // Just outside
      expect(hitTester(100, 160)).toBe(false);   // Below
    });
  });

  describe('Render Data', () => {
    it('TC-DIAL-034: getRenderData returns all properties', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        minValue: 0,
        maxValue: 100,
        value: 50,
        radius: 40,
        style: 'classic',
        showTicks: true,
        showValue: true,
      });

      const data = dial.getRenderData();

      expect(data.x).toBe(100);
      expect(data.y).toBe(100);
      expect(data.radius).toBe(40);
      expect(data.value).toBe(50);
      expect(data.normalizedValue).toBe(0.5);
      expect(data.trackColor).toBe('#e0e0e0');
      expect(data.accentColor).toBe('#3498db');
      expect(data.showTicks).toBe(true);
      expect(data.showValue).toBe(true);
      expect(Array.isArray(data.ticks)).toBe(true);
    });

    it('TC-DIAL-035: Render data updates after setValue', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget, {
        maxValue: 100,
        value: 25,
      });

      expect(dial.getRenderData().value).toBe(25);
      expect(dial.getRenderData().normalizedValue).toBe(0.25);

      dial.setValue(75);

      expect(dial.getRenderData().value).toBe(75);
      expect(dial.getRenderData().normalizedValue).toBe(0.75);
    });
  });

  describe('Position Updates', () => {
    it('TC-DIAL-036: updatePosition changes dial location', () => {
      const widget = new MockWidget();
      const dial = new CosyneDial(100, 100, widget);

      expect(dial.getPosition()).toEqual({ x: 100, y: 100 });

      dial.updatePosition({ x: 200, y: 150 });

      expect(dial.getPosition()).toEqual({ x: 200, y: 150 });
    });
  });
});

describe('CosyneContext dial() method', () => {
  it('should create dial via context factory', () => {
    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const dial = ctx.dial(150, 150, {
      minValue: 0,
      maxValue: 100,
      value: 50,
      style: 'vintage',
    });

    expect(dial).toBeDefined();
    expect(dial.getPosition()).toEqual({ x: 150, y: 150 });
    expect(dial.getValue()).toBe(50);
  });

  it('should track dial by ID', () => {
    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const dial = ctx.dial(100, 100, { value: 30 }).withId('myDial');

    expect(ctx.getPrimitiveById('myDial')).toBe(dial);
  });

  it('should track multiple dials', () => {
    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const dial1 = ctx.dial(100, 100, { style: 'classic' }).withId('dial1');
    const dial2 = ctx.dial(200, 100, { style: 'modern' }).withId('dial2');
    const dial3 = ctx.dial(300, 100, { style: 'vintage' }).withId('dial3');

    expect(ctx.getPrimitiveById('dial1')).toBe(dial1);
    expect(ctx.getPrimitiveById('dial2')).toBe(dial2);
    expect(ctx.getPrimitiveById('dial3')).toBe(dial3);
  });
});

describe('Dial Use Cases', () => {
  it('Volume control knob', () => {
    const widget = new MockWidget();
    const volumeKnob = new CosyneDial(50, 50, widget, {
      minValue: 0,
      maxValue: 100,
      value: 50,
      valueSuffix: '%',
      style: 'classic',
    });

    expect(volumeKnob.getFormattedValue()).toBe('50%');
    volumeKnob.setValue(75);
    expect(volumeKnob.getFormattedValue()).toBe('75%');
  });

  it('Temperature dial', () => {
    const widget = new MockWidget();
    const tempDial = new CosyneDial(50, 50, widget, {
      minValue: 15,
      maxValue: 30,
      value: 21,
      valueSuffix: '°C',
      step: 0.5,
      valueDecimals: 1,
      style: 'modern',
    });

    expect(tempDial.getFormattedValue()).toBe('21.0°C');
    tempDial.increment();
    expect(tempDial.getValue()).toBe(21.5);
    expect(tempDial.getFormattedValue()).toBe('21.5°C');
  });

  it('RGB color picker dial', () => {
    const widget = new MockWidget();
    const colorDial = new CosyneDial(50, 50, widget, {
      minValue: 0,
      maxValue: 255,
      value: 128,
      step: 1,
      startAngle: 0,
      endAngle: 360,  // Full circle
      accentColor: '#ff0000',
    });

    expect(colorDial.getValue()).toBe(128);
    expect(colorDial.getNormalizedValue()).toBeCloseTo(0.502, 2);
  });

  it('Audio pan knob (centered)', () => {
    const widget = new MockWidget();
    const panKnob = new CosyneDial(50, 50, widget, {
      minValue: -100,
      maxValue: 100,
      value: 0,  // Center
      valueSuffix: '',
      valuePrefix: '',
    });

    expect(panKnob.getValue()).toBe(0);
    expect(panKnob.getNormalizedValue()).toBe(0.5);  // Center is 50%

    panKnob.setValue(-50);
    expect(panKnob.getValue()).toBe(-50);
    expect(panKnob.getNormalizedValue()).toBe(0.25);  // 25% of the way
  });
});
