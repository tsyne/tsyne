/**
 * RoundTrip Test: Grid Layout
 * XStream-style: inline code, exact assertions
 */

import {
  loadFromString,
  save,
  updateWidgetId,
  findWidget
} from './helpers';

describe('RoundTrip: Grid Layout', () => {
  test('load and save with no edits', async () => {
    const code = `import { app, window, vbox, grid, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("Cell 1");
        label("Cell 2");
        label("Cell 3");
        label("Cell 4");
      });
    });
  });
});`;

    const result = await loadFromString(code);
    expect(result.success).toBe(true);

    const saveResult = await save('memory');

    expect(saveResult.content).toBe(code);
  });

  test('adding .withId() to grid container', async () => {
    const original = `import { app, window, vbox, grid, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("A");
        label("B");
      });
    });
  });
});`;

    const result = await loadFromString(original);
    const gridWidget = findWidget(result.metadata, 'grid');

    await updateWidgetId(gridWidget.id, null, 'labelGrid');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, grid, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("A");
        label("B");
      }).withId('labelGrid');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('renaming .withId() on grid', async () => {
    const original = `import { app, window, vbox, grid, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("A");
        label("B");
      }).withId('oldGridId');
    });
  });
});`;

    const result = await loadFromString(original);
    const gridWidget = result.metadata.widgets.find((w: any) => w.widgetId === 'oldGridId');

    await updateWidgetId(gridWidget.id, 'oldGridId', 'newGridId');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, grid, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("A");
        label("B");
      }).withId('newGridId');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('removing .withId() from grid', async () => {
    const original = `import { app, window, vbox, grid, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("A");
        label("B");
      }).withId('tempGrid');
    });
  });
});`;

    const result = await loadFromString(original);
    const gridWidget = result.metadata.widgets.find((w: any) => w.widgetId === 'tempGrid');

    await updateWidgetId(gridWidget.id, 'tempGrid', null);

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, grid, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("A");
        label("B");
      });
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('grid with 3 columns', async () => {
    const original = `import { app, window, vbox, grid, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(3, () => {
        button("1", () => {});
        button("2", () => {});
        button("3", () => {});
        button("4", () => {});
        button("5", () => {});
        button("6", () => {});
      });
    });
  });
});`;

    const result = await loadFromString(original);
    expect(result.success).toBe(true);

    const saveResult = await save('memory');

    expect(saveResult.content).toBe(original);
  });

  test('adding .withId() to labels in grid cells', async () => {
    const original = `import { app, window, vbox, grid, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("A");
        label("B");
        label("C");
        label("D");
      });
    });
  });
});`;

    const result = await loadFromString(original);

    const gridWidget = findWidget(result.metadata, 'grid');
    const labelsInGrid = result.metadata.widgets.filter((w: any) =>
      w.widgetType === 'label' && w.parent === gridWidget.id
    );

    await updateWidgetId(labelsInGrid[0].id, null, 'cell_1_1');
    await updateWidgetId(labelsInGrid[1].id, null, 'cell_1_2');
    await updateWidgetId(labelsInGrid[2].id, null, 'cell_2_1');
    await updateWidgetId(labelsInGrid[3].id, null, 'cell_2_2');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, grid, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("A").withId('cell_1_1');
        label("B").withId('cell_1_2');
        label("C").withId('cell_2_1');
        label("D").withId('cell_2_2');
      });
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('adding .withId() to buttons in 3-column grid', async () => {
    const original = `import { app, window, vbox, grid, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(3, () => {
        button("1", () => {});
        button("2", () => {});
        button("3", () => {});
      });
    });
  });
});`;

    const result = await loadFromString(original);

    const buttons = result.metadata.widgets.filter((w: any) => w.widgetType === 'button');
    const btn1 = buttons.find((b: any) => b.properties.text === '1');
    const btn2 = buttons.find((b: any) => b.properties.text === '2');
    const btn3 = buttons.find((b: any) => b.properties.text === '3');

    await updateWidgetId(btn1.id, null, 'gridBtn1');
    await updateWidgetId(btn2.id, null, 'gridBtn2');
    await updateWidgetId(btn3.id, null, 'gridBtn3');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, grid, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(3, () => {
        button("1", () => {}).withId('gridBtn1');
        button("2", () => {}).withId('gridBtn2');
        button("3", () => {}).withId('gridBtn3');
      });
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('nested vbox in grid cells', async () => {
    const original = `import { app, window, vbox, grid, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        vbox(() => {
          label("Column A");
        });
        vbox(() => {
          label("Column B");
        });
      });
    });
  });
});`;

    const result = await loadFromString(original);
    expect(result.success).toBe(true);

    const saveResult = await save('memory');

    expect(saveResult.content).toBe(original);
  });

  test('adding .withId() to nested vbox in grid', async () => {
    const original = `import { app, window, vbox, grid, label, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        vbox(() => {
          label("Column A");
          button("A1", () => {});
        });
        vbox(() => {
          label("Column B");
          button("B1", () => {});
        });
      });
    });
  });
});`;

    const result = await loadFromString(original);

    const gridWidget = findWidget(result.metadata, 'grid');
    const vboxesInGrid = result.metadata.widgets.filter((w: any) =>
      w.widgetType === 'vbox' && w.parent === gridWidget.id
    );

    await updateWidgetId(vboxesInGrid[0].id, null, 'columnA');
    await updateWidgetId(vboxesInGrid[1].id, null, 'columnB');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, grid, label, button } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        vbox(() => {
          label("Column A");
          button("A1", () => {});
        }).withId('columnA');
        vbox(() => {
          label("Column B");
          button("B1", () => {});
        }).withId('columnB');
      });
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('multiple grids with different column counts', async () => {
    const original = `import { app, window, vbox, grid, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("2-col A");
        label("2-col B");
      });
      grid(3, () => {
        label("3-col A");
        label("3-col B");
        label("3-col C");
      });
    });
  });
});`;

    const result = await loadFromString(original);

    const grids = result.metadata.widgets.filter((w: any) => w.widgetType === 'grid');

    expect(grids.length).toBe(2);

    await updateWidgetId(grids[0].id, null, 'grid2col');
    await updateWidgetId(grids[1].id, null, 'grid3col');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, grid, label } from '../core/src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      grid(2, () => {
        label("2-col A");
        label("2-col B");
      }).withId('grid2col');
      grid(3, () => {
        label("3-col A");
        label("3-col B");
        label("3-col C");
      }).withId('grid3col');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });
});
