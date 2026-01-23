/**
 * Test: CSS Editor Widget Tracking
 *
 * Verifies that the CSS editor correctly identifies and displays
 * which widgets use each CSS class.
 */

import {
  loadFromString
} from '../roundtrip/helpers';

describe('CSS Editor Widget Tracking', () => {
  test('findWidgetsUsingClass identifies widgets by className', async () => {
    const source = `import { app } from 'tsyne';

const styles = {
  title: {
    fontSize: 20,
    bold: true
  },
  subtitle: {
    fontSize: 14,
    italic: true
  }
};

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Main Title', 'title');
        a.label('Subtitle Text', 'subtitle');
        a.label('No Class');
        a.button('Click', "title").onClick(() => {});
      });
    });
    win.show();
  });
});`;

    const loadResult = await loadFromString(source);
    expect(loadResult.success).toBe(true);

    console.log('Widgets:', loadResult.metadata.widgets.map((w: any) => ({
      type: w.widgetType,
      text: w.properties?.text,
      className: w.properties?.className
    })));

    // Find widgets with className 'title'
    const titleWidgets = loadResult.metadata.widgets.filter((w: any) =>
      w.properties && w.properties.className === 'title'
    );
    console.log('Title widgets:', titleWidgets.map((w: any) => ({ type: w.widgetType, text: w.properties?.text })));
    expect(titleWidgets.length).toBe(2); // label and button

    // Find widgets with className 'subtitle'
    const subtitleWidgets = loadResult.metadata.widgets.filter((w: any) =>
      w.properties && w.properties.className === 'subtitle'
    );
    expect(subtitleWidgets.length).toBe(1); // just the label
  });

  test('getWidgetPath returns ID when available', async () => {
    const source = `import { app } from 'tsyne';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Title', 'title').withId('mainTitle');
      });
    });
    win.show();
  });
});`;

    const loadResult = await loadFromString(source);
    expect(loadResult.success).toBe(true);

    const labelWidget = loadResult.metadata.widgets.find((w: any) =>
      w.widgetType === 'label'
    );
    expect(labelWidget).toBeDefined();
    expect(labelWidget.widgetId).toBe('mainTitle');
  });

  test('getWidgetPath builds path for widgets without ID', async () => {
    const source = `import { app } from 'tsyne';

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('My Label', 'myClass');
      });
    });
    win.show();
  });
});`;

    const loadResult = await loadFromString(source);
    expect(loadResult.success).toBe(true);

    const labelWidget = loadResult.metadata.widgets.find((w: any) =>
      w.widgetType === 'label'
    );
    expect(labelWidget).toBeDefined();
    expect(labelWidget.widgetId).toBeNull(); // No ID

    // Widget should have text property that can be used for path
    expect(labelWidget.properties.text).toBe('My Label');
  });

  test('CSS classes are extracted from source', async () => {
    const source = `import { app } from 'tsyne';

const styles = {
  header: {
    fontSize: 24,
    bold: true,
    color: '#ffffff'
  },
  description: {
    fontSize: 12,
    italic: true
  }
};

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Header', 'header');
      });
    });
    win.show();
  });
});`;

    const loadResult = await loadFromString(source);
    expect(loadResult.success).toBe(true);
    expect(loadResult.styles).toBeDefined();
    expect(loadResult.styles.header).toBeDefined();
    expect(loadResult.styles.description).toBeDefined();
    expect(loadResult.styles.header.fontSize).toBe(24);
  });

  test('unused CSS classes are identified', async () => {
    const source = `import { app } from 'tsyne';

const styles = {
  used: { fontSize: 20 },
  unused: { fontSize: 14 }
};

app({ title: 'Test' }, (a) => {
  a.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Text', 'used');
      });
    });
    win.show();
  });
});`;

    const loadResult = await loadFromString(source);
    expect(loadResult.success).toBe(true);

    // 'used' class should have 1 widget
    const usedWidgets = loadResult.metadata.widgets.filter((w: any) =>
      w.properties && w.properties.className === 'used'
    );
    expect(usedWidgets.length).toBe(1);

    // 'unused' class should have 0 widgets
    const unusedWidgets = loadResult.metadata.widgets.filter((w: any) =>
      w.properties && w.properties.className === 'unused'
    );
    expect(unusedWidgets.length).toBe(0);
  });
});
