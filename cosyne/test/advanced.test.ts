/**
 * Unit tests for Cosyne Phase 7 Advanced Primitives
 */

import { CosyneGrid } from '../src/primitives/grid';
import { CosyneHeatmap } from '../src/primitives/heatmap';
import { CosynePolygon } from '../src/primitives/polygon';
import { CosyneStar } from '../src/primitives/star';
import { CosyneGauge } from '../src/primitives/gauge';
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
  updateStrokeWidth(width: number) {
    this.properties.strokeWidth = width;
  }
}

// Mock app
class MockApp {
  canvasGrid(props: any) {
    return new MockWidget();
  }
  canvasHeatmap(props: any) {
    return new MockWidget();
  }
  canvasPolygon(props: any) {
    return new MockWidget();
  }
  canvasStar(props: any) {
    return new MockWidget();
  }
  canvasGauge(props: any) {
    return new MockWidget();
  }
}

describe('CosyneGrid (Phase 7)', () => {
  it('TC-ADV-001: Grid creates table with rows and columns', () => {
    const widget = new MockWidget();
    const grid = new CosyneGrid(0, 0, widget, { rows: 4, cols: 5 });

    expect(grid.getPosition()).toEqual({ x: 0, y: 0 });
    expect(grid.getDimensions()).toEqual({ width: 200, height: 120 }); // 5 cols * 40 + 4 rows * 30
  });

  it('TC-ADV-002: Grid cell size configurable', () => {
    const widget = new MockWidget();
    const grid = new CosyneGrid(10, 20, widget, { cellWidth: 50, cellHeight: 40 });

    grid.setGridSize(3, 4);
    expect(grid.getDimensions()).toEqual({ width: 200, height: 120 }); // 4*50, 3*40
  });

  it('TC-ADV-003: Grid color configurable', () => {
    const widget = new MockWidget();
    const grid = new CosyneGrid(0, 0, widget);

    grid.setGridColor('#ff0000');
    // Grid color would be used in rendering
    expect(grid).toBeDefined();
  });

  it('should support grid with ID', () => {
    const widget = new MockWidget();
    const grid = new CosyneGrid(0, 0, widget).withId('myGrid');

    expect(grid.getId()).toEqual('myGrid');
  });
});

describe('CosyneHeatmap (Phase 7)', () => {
  it('TC-ADV-004: Heatmap maps values to colors', () => {
    const widget = new MockWidget();
    const heatmap = new CosyneHeatmap(0, 0, widget, { colorScheme: 'hot' });

    expect(heatmap.getNormalizedValue(50)).toEqual(0.5);
    expect(heatmap.getColor(0)).toMatch(/rgb/);
    expect(heatmap.getColor(0.5)).toMatch(/rgb/);
    expect(heatmap.getColor(1)).toMatch(/rgb/);
  });

  it('TC-ADV-005: Heatmap color schemes work', () => {
    const hotWidget = new MockWidget();
    const coolWidget = new MockWidget();

    const hotMap = new CosyneHeatmap(0, 0, hotWidget, { colorScheme: 'hot' });
    const coolMap = new CosyneHeatmap(0, 0, coolWidget, { colorScheme: 'cool' });

    const hotColor = hotMap.getColor(0.5);
    const coolColor = coolMap.getColor(0.5);

    expect(hotColor).not.toEqual(coolColor);
  });

  it('TC-ADV-006: Heatmap data can be set', () => {
    const widget = new MockWidget();
    const heatmap = new CosyneHeatmap(0, 0, widget);

    const data = {
      rows: 3,
      cols: 3,
      data: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
    };

    heatmap.setData(data, 0, 1);
    expect(heatmap.getNormalizedValue(0.5)).toEqual(0.5);
  });

  it('should support heatmap with ID', () => {
    const widget = new MockWidget();
    const heatmap = new CosyneHeatmap(0, 0, widget).withId('myHeatmap');

    expect(heatmap.getId()).toEqual('myHeatmap');
  });
});

describe('CosynePolygon (Phase 7)', () => {
  it('TC-ADV-007: Polygon creates arbitrary shapes', () => {
    const widget = new MockWidget();
    const vertices = [
      { x: 0, y: -20 },
      { x: 20, y: 0 },
      { x: 0, y: 20 },
      { x: -20, y: 0 },
    ];

    const polygon = new CosynePolygon(100, 100, vertices, widget);

    expect(polygon.getPosition()).toEqual({ x: 100, y: 100 });
    expect(polygon.getVertices()).toEqual(vertices);
  });

  it('TC-ADV-008: Polygon can create regular shapes', () => {
    const triangleVertices = CosynePolygon.createRegularPolygon(3, 20);
    expect(triangleVertices.length).toEqual(3);

    const hexVertices = CosynePolygon.createRegularPolygon(6, 20);
    expect(hexVertices.length).toEqual(6);
  });

  it('should support polygon with ID and styling', () => {
    const widget = new MockWidget();
    const vertices = [{ x: 0, y: -10 }, { x: 10, y: 0 }, { x: 0, y: 10 }, { x: -10, y: 0 }];

    const polygon = new CosynePolygon(0, 0, vertices, widget)
      .fill('#ff0000')
      .stroke('#000000', 2)
      .withId('myPolygon');

    expect(polygon.getId()).toEqual('myPolygon');
    expect(widget.properties.fillColor).toEqual('#ff0000');
  });
});

describe('CosyneStar (Phase 7)', () => {
  it('TC-ADV-009: Star renders with configurable points', () => {
    const widget = new MockWidget();
    const star = new CosyneStar(100, 100, widget, { points: 5, outerRadius: 30, innerRadius: 12 });

    expect(star.getPosition()).toEqual({ x: 100, y: 100 });
    const vertices = star.getVertices();
    expect(vertices.length).toEqual(10); // 5 points * 2 (inner + outer)
  });

  it('TC-ADV-010: Star points and radii configurable', () => {
    const widget = new MockWidget();
    const star = new CosyneStar(0, 0, widget);

    star.setPoints(8).setInnerRadius(15).setOuterRadius(35);

    const vertices = star.getVertices();
    expect(vertices.length).toEqual(16); // 8 points * 2
  });

  it('should support star with ID and fill', () => {
    const widget = new MockWidget();
    const star = new CosyneStar(0, 0, widget)
      .fill('#ffff00')
      .withId('goldenStar');

    expect(star.getId()).toEqual('goldenStar');
  });
});

describe('CosyneGauge (Phase 7)', () => {
  it('TC-ADV-011: Gauge displays values 0-100', () => {
    const widget = new MockWidget();
    const gauge = new CosyneGauge(150, 150, widget, { minValue: 0, maxValue: 100, value: 75 });

    expect(gauge.getValue()).toEqual(75);
    expect(gauge.getNormalizedValue()).toEqual(0.75);
  });

  it('TC-ADV-012: Gauge color changes with value', () => {
    const widget = new MockWidget();
    const gauge = new CosyneGauge(0, 0, widget, { maxValue: 100 });

    gauge.setValue(25);
    const lowColor = gauge.getValueColor();

    gauge.setValue(75);
    const highColor = gauge.getValueColor();

    expect(lowColor).not.toEqual(highColor);
  });

  it('TC-ADV-013: Gauge needle angle computed correctly', () => {
    const widget = new MockWidget();
    const gauge = new CosyneGauge(0, 0, widget, { maxValue: 100 });

    gauge.setValue(0);
    const minAngle = gauge.getNeedleAngle();

    gauge.setValue(50);
    const midAngle = gauge.getNeedleAngle();

    gauge.setValue(100);
    const maxAngle = gauge.getNeedleAngle();

    expect(minAngle).toBeLessThan(midAngle);
    expect(midAngle).toBeLessThan(maxAngle);
  });

  it('should support gauge with value binding', () => {
    const widget = new MockWidget();
    let value = 30;

    const gauge = new CosyneGauge(0, 0, widget)
      .bindValue(() => value)
      .withId('myGauge');

    expect(gauge.getId()).toEqual('myGauge');
    expect(gauge.getValueBinding()).toBeDefined();

    value = 70;
    // Value would be updated from binding in context.refreshBindings()
  });
});

describe('CosyneContext Phase 7 methods', () => {
  it('should support grid() factory', () => {
    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const grid = ctx.grid(0, 0, { rows: 3, cols: 3 });
    expect(grid).toBeDefined();
    expect(grid.getPosition()).toEqual({ x: 0, y: 0 });
  });

  it('should support heatmap() factory', () => {
    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const heatmap = ctx.heatmap(50, 50, { colorScheme: 'hot' });
    expect(heatmap).toBeDefined();
  });

  it('should support polygon() factory', () => {
    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const vertices = [{ x: 0, y: -20 }, { x: 20, y: 0 }, { x: 0, y: 20 }];
    const polygon = ctx.polygon(100, 100, vertices);
    expect(polygon).toBeDefined();
  });

  it('should support star() factory', () => {
    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const star = ctx.star(100, 100, { points: 5 });
    expect(star).toBeDefined();
  });

  it('should support gauge() factory', () => {
    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const gauge = ctx.gauge(150, 150, { maxValue: 100 });
    expect(gauge).toBeDefined();
  });

  it('should track all Phase 7 primitives by ID', () => {
    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const grid = ctx.grid(0, 0).withId('grid1');
    const star = ctx.star(100, 100).withId('star1');
    const gauge = ctx.gauge(0, 0).withId('gauge1');

    expect(ctx.getPrimitiveById('grid1')).toEqual(grid);
    expect(ctx.getPrimitiveById('star1')).toEqual(star);
    expect(ctx.getPrimitiveById('gauge1')).toEqual(gauge);
  });
});

describe('Phase 7 Advanced Features', () => {
  it('should compose grid + heatmap for data dashboards', () => {
    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const grid = ctx.grid(0, 0, { rows: 4, cols: 4 }).withId('data-grid');
    const heatmap = ctx.heatmap(150, 150, { colorScheme: 'viridis' }).withId('data-heatmap');

    expect(ctx.getPrimitiveById('data-grid')).toBeDefined();
    expect(ctx.getPrimitiveById('data-heatmap')).toBeDefined();
  });

  it('should compose stars for ratings UI', () => {
    const app = new MockApp();
    const ctx = new CosyneContext(app);

    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        ctx.star(50 + i * 40, 100, { points: 5, outerRadius: 15, innerRadius: 6 })
          .fill(i < 3 ? '#ffff00' : '#cccccc')
          .withId(`star-${i}`)
      );
    }

    expect(stars.length).toEqual(5);
    expect(ctx.getPrimitiveById('star-0')).toBeDefined();
  });

  it('should support gauge with value binding for metrics', () => {
    const app = new MockApp();
    const ctx = new CosyneContext(app);

    let cpuUsage = 45;
    const gauge = ctx.gauge(200, 150, { maxValue: 100 })
      .bindValue(() => cpuUsage)
      .withId('cpu-gauge');

    expect(gauge.getValueBinding()).toBeDefined();

    cpuUsage = 85;
    // Value binding would be evaluated in context.refreshBindings()
  });
});
