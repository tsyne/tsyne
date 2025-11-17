/**
 * RoundTrip Test: HBox Horizontal Layout
 * XStream-style: inline code, exact assertions
 */

import {
  loadFromString,
  save,
  updateWidgetId,
  findWidget
} from './helpers';

describe('RoundTrip: HBox Horizontal Layout', () => {
  test('load and save with no edits', async () => {
    const code = `import { app, window, vbox, hbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("Left", () => {});
        button("Center", () => {});
        button("Right", () => {});
      });
    });
  });
});`;

    const result = await loadFromString(code);
    expect(result.success).toBe(true);

    const saveResult = await save('memory');

    expect(saveResult.content).toBe(code);
  });

  test('adding .withId() to hbox container', async () => {
    const original = `import { app, window, vbox, hbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("OK", () => {});
      });
    });
  });
});`;

    const result = await loadFromString(original);
    const hboxWidget = findWidget(result.metadata, 'hbox');

    await updateWidgetId(hboxWidget.id, null, 'buttonGroup');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, hbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("OK", () => {});
      }).withId('buttonGroup');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('adding .withId() to buttons inside hbox', async () => {
    const original = `import { app, window, vbox, hbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("Left", () => {});
        button("Center", () => {});
        button("Right", () => {});
      });
    });
  });
});`;

    const result = await loadFromString(original);

    const buttons = result.metadata.widgets.filter((w: any) => w.widgetType === 'button');
    const leftBtn = buttons.find((b: any) => b.properties.text === 'Left');
    const centerBtn = buttons.find((b: any) => b.properties.text === 'Center');
    const rightBtn = buttons.find((b: any) => b.properties.text === 'Right');

    await updateWidgetId(leftBtn.id, null, 'leftBtn');
    await updateWidgetId(centerBtn.id, null, 'centerBtn');
    await updateWidgetId(rightBtn.id, null, 'rightBtn');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, hbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("Left", () => {}).withId('leftBtn');
        button("Center", () => {}).withId('centerBtn');
        button("Right", () => {}).withId('rightBtn');
      });
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('nested vbox inside hbox', async () => {
    const original = `import { app, window, vbox, hbox, label } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        vbox(() => {
          label("Column 1");
        });
        vbox(() => {
          label("Column 2");
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

  test('adding .withId() to nested vbox inside hbox', async () => {
    const original = `import { app, window, vbox, hbox, label } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        vbox(() => {
          label("Column 1");
        });
      });
    });
  });
});`;

    const result = await loadFromString(original);

    const vboxes = result.metadata.widgets.filter((w: any) => w.widgetType === 'vbox');
    const nestedVbox = vboxes.find((v: any) => {
      const parent = result.metadata.widgets.find((w: any) => w.id === v.parent);
      return parent && parent.widgetType === 'hbox';
    });

    await updateWidgetId(nestedVbox.id, null, 'column1');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, hbox, label } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        vbox(() => {
          label("Column 1");
        }).withId('column1');
      });
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('renaming .withId() on hbox', async () => {
    const original = `import { app, window, vbox, hbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("OK", () => {});
      }).withId('oldHboxId');
    });
  });
});`;

    const result = await loadFromString(original);
    const hboxWidget = result.metadata.widgets.find((w: any) => w.widgetId === 'oldHboxId');

    await updateWidgetId(hboxWidget.id, 'oldHboxId', 'newHboxId');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, hbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("OK", () => {});
      }).withId('newHboxId');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('removing .withId() from hbox', async () => {
    const original = `import { app, window, vbox, hbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("OK", () => {});
      }).withId('tempHbox');
    });
  });
});`;

    const result = await loadFromString(original);
    const hboxWidget = result.metadata.widgets.find((w: any) => w.widgetId === 'tempHbox');

    await updateWidgetId(hboxWidget.id, 'tempHbox', null);

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, hbox, button } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("OK", () => {});
      });
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });

  test('multiple hbox containers', async () => {
    const original = `import { app, window, vbox, hbox, button, label } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("A", () => {});
        button("B", () => {});
      });
      hbox(() => {
        label("Row 2");
      });
    });
  });
});`;

    const result = await loadFromString(original);

    const hboxes = result.metadata.widgets.filter((w: any) => w.widgetType === 'hbox');

    expect(hboxes.length).toBe(2);

    await updateWidgetId(hboxes[0].id, null, 'buttonRow');
    await updateWidgetId(hboxes[1].id, null, 'labelRow');

    const saveResult = await save('memory');

    const expected = `import { app, window, vbox, hbox, button, label } from '../src';

app({ title: "Test" }, () => {
  window({ title: "Test" }, () => {
    vbox(() => {
      hbox(() => {
        button("A", () => {});
        button("B", () => {});
      }).withId('buttonRow');
      hbox(() => {
        label("Row 2");
      }).withId('labelRow');
    });
  });
});`;

    expect(saveResult.content).toBe(expected);
  });
});
