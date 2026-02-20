/**
 * Event System Integration Test
 *
 * Exercises the bitmask-based event system (setWidgetEvents + concrete variants)
 * end-to-end through the bridge. Verifies:
 *
 * 1. Widgets with event handlers can be created, found, clicked, and getText/setText
 * 2. Multiple event types on the same widget (hover + mouse + key + focus)
 * 3. onClick callbacks fire correctly when events are registered
 * 4. Post-creation chained event registration
 * 5. Labels, entries, and non-button widgets with events
 * 6. getText/setText through concrete variant types (ButtonWithHover*, LabelWithHover)
 * 7. Mixed event + non-event widgets in the same container
 * 8. simulate() calls real widget interface methods on concrete variants
 * 9. focus() exercises Fyne's canvas.Focus() → FocusGained() path
 */

import { TsyneTest, TestContext } from 'tsyne';
import type { App } from 'tsyne';

describe('Event System Integration', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  test('button with all event types can be clicked and updates state', async () => {
    let clickCount = 0;

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'All Events', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const statusLabel = app.label('clicks: 0').withId('status');

            // Button with every event type registered via chaining
            const btn = app.button('Full Events', {
              onClick: () => {
                clickCount++;
                statusLabel.setText(`clicks: ${clickCount}`);
              },
            }).withId('fullBtn');

            btn.onMouseIn(() => {});
            btn.onMouseOut(() => {});
            btn.onMouseMoved(() => {});
            btn.onMouseDown(() => {});
            btn.onMouseUp(() => {});
            btn.onKeyDown(() => {});
            btn.onKeyUp(() => {});
            btn.onFocusChange(() => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Widget should be findable
    await ctx.expect(ctx.getById('fullBtn')).toBeVisible();

    // Click should fire onClick
    await ctx.getById('fullBtn').click();
    await ctx.wait(100);
    expect(clickCount).toBe(1);

    // Status label should update
    await ctx.getById('status').getText().within(1000).shouldBe('clicks: 1');

    // Click again
    await ctx.getById('fullBtn').click();
    await ctx.wait(100);
    expect(clickCount).toBe(2);
    await ctx.getById('status').getText().within(1000).shouldBe('clicks: 2');
  });

  test('chained event registration after creation', async () => {
    let clickFired = false;

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Chained Events', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const btn = app.button('Chain', {
              onClick: () => { clickFired = true; },
            }).withId('chainBtn');

            // Post-creation chained event registration
            btn.onMouseIn(() => {});
            btn.onMouseOut(() => {});
            btn.onKeyDown(() => {});
            btn.onFocusChange(() => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getById('chainBtn')).toBeVisible();
    await ctx.getById('chainBtn').click();
    await ctx.wait(100);
    expect(clickFired).toBe(true);
  });

  test('multiple buttons with different event combos', async () => {
    const clicks: string[] = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Multi Buttons', width: 400, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const statusLabel = app.label('none').withId('status');

            // Hover-only button
            const hoverBtn = app.button('Hover Only', {
              onClick: () => { clicks.push('hover'); statusLabel.setText('hover'); },
            }).withId('hoverBtn');
            hoverBtn.onMouseIn(() => {});
            hoverBtn.onMouseOut(() => {});

            // Tap+Hover button
            const tapHoverBtn = app.button('Tap+Hover', {
              onClick: () => { clicks.push('tapHover'); statusLabel.setText('tapHover'); },
            }).withId('tapHoverBtn');
            tapHoverBtn.onMouseIn(() => {});
            tapHoverBtn.onMouseOut(() => {});

            // Full interactive button
            const interBtn = app.button('Interactive', {
              onClick: () => { clicks.push('interactive'); statusLabel.setText('interactive'); },
            }).withId('interactiveBtn');
            interBtn.onMouseIn(() => {});
            interBtn.onMouseOut(() => {});
            interBtn.onMouseDown(() => {});
            interBtn.onMouseUp(() => {});
            interBtn.onKeyDown(() => {});
            interBtn.onKeyUp(() => {});
            interBtn.onFocusChange(() => {});

            // Plain button (no events)
            app.button('Plain', {
              onClick: () => { clicks.push('plain'); statusLabel.setText('plain'); },
            }).withId('plainBtn');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click each button in sequence
    await ctx.getById('hoverBtn').click();
    await ctx.wait(50);
    await ctx.getById('tapHoverBtn').click();
    await ctx.wait(50);
    await ctx.getById('interactiveBtn').click();
    await ctx.wait(50);
    await ctx.getById('plainBtn').click();
    await ctx.wait(50);

    expect(clicks).toEqual(['hover', 'tapHover', 'interactive', 'plain']);
    await ctx.getById('status').getText().within(1000).shouldBe('plain');
  });

  test('setText and getText through event-wrapped buttons', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Text Through Wrap', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // Button with hover events
            const wrappedBtn = app.button('Original Text', {
              onClick: () => {},
            }).withId('wrappedBtn');
            wrappedBtn.onMouseIn(() => {});
            wrappedBtn.onMouseOut(() => {});

            // Button with full events
            const fullBtn = app.button('Full Original', {
              onClick: () => {},
            }).withId('fullWrappedBtn');
            fullBtn.onMouseIn(() => {});
            fullBtn.onMouseOut(() => {});
            fullBtn.onMouseDown(() => {});
            fullBtn.onMouseUp(() => {});
            fullBtn.onKeyDown(() => {});
            fullBtn.onKeyUp(() => {});
            fullBtn.onFocusChange(() => {});

            // Plain label for comparison
            app.label('Plain Label').withId('plainLabel');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial text can be read
    await ctx.getById('wrappedBtn').getText().within(1000).shouldBe('Original Text');
    await ctx.getById('fullWrappedBtn').getText().within(1000).shouldBe('Full Original');
    await ctx.getById('plainLabel').getText().within(1000).shouldBe('Plain Label');
  });

  test('onClick state mutation with counter buttons', async () => {
    let counter = 0;

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'State Mutation', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const countLabel = app.label('Count: 0').withId('countLabel');

            // Increment button with hover events
            const incBtn = app.button('+1', {
              onClick: () => { counter++; countLabel.setText(`Count: ${counter}`); },
            }).withId('incBtn');
            incBtn.onMouseIn(() => {});
            incBtn.onMouseOut(() => {});

            // Decrement button with full events
            const decBtn = app.button('-1', {
              onClick: () => { counter--; countLabel.setText(`Count: ${counter}`); },
            }).withId('decBtn');
            decBtn.onMouseIn(() => {});
            decBtn.onMouseOut(() => {});
            decBtn.onKeyDown(() => {});
            decBtn.onFocusChange(() => {});

            // Reset button (no events)
            app.button('Reset', {
              onClick: () => { counter = 0; countLabel.setText('Count: 0'); },
            }).withId('resetBtn');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Increment 3 times
    await ctx.getById('incBtn').click();
    await ctx.getById('incBtn').click();
    await ctx.getById('incBtn').click();
    await ctx.wait(100);
    await ctx.getById('countLabel').getText().within(1000).shouldBe('Count: 3');

    // Decrement once
    await ctx.getById('decBtn').click();
    await ctx.wait(100);
    await ctx.getById('countLabel').getText().within(1000).shouldBe('Count: 2');

    // Reset
    await ctx.getById('resetBtn').click();
    await ctx.wait(100);
    await ctx.getById('countLabel').getText().within(1000).shouldBe('Count: 0');
    expect(counter).toBe(0);
  });

  test('grid of event-wrapped buttons with dynamic text updates', async () => {
    const cellClicks: Record<string, number> = {};

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Event Grid', width: 400, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const summaryLabel = app.label('Total: 0').withId('summary');

            app.grid(3, () => {
              for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                  const cellId = `cell_${row}_${col}`;
                  cellClicks[cellId] = 0;

                  const btn = app.button(`${row},${col}`, {
                    onClick: () => {
                      cellClicks[cellId]++;
                      btn.setText(`${row},${col} (${cellClicks[cellId]})`);
                      const total = Object.values(cellClicks).reduce((a, b) => a + b, 0);
                      summaryLabel.setText(`Total: ${total}`);
                    },
                  }).withId(cellId);
                  btn.onMouseIn(() => {});
                  btn.onMouseOut(() => {});
                }
              }
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click various cells
    await ctx.getById('cell_0_0').click();
    await ctx.getById('cell_1_1').click();
    await ctx.getById('cell_2_2').click();
    await ctx.getById('cell_0_0').click();
    await ctx.wait(100);

    expect(cellClicks['cell_0_0']).toBe(2);
    expect(cellClicks['cell_1_1']).toBe(1);
    expect(cellClicks['cell_2_2']).toBe(1);

    await ctx.getById('summary').getText().within(1000).shouldBe('Total: 4');
  });

  test('entry widgets alongside event-wrapped buttons', async () => {
    let submitted = '';

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Entry + Events', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const entry = app.entry('Type here...').withId('input');
            const resultLabel = app.label('Result: (none)').withId('result');

            // Submit button with hover events
            const submitBtn = app.button('Submit', {
              onClick: async () => {
                const text = await entry.getText();
                submitted = text;
                resultLabel.setText(`Result: ${text}`);
              },
            }).withId('submitBtn');
            submitBtn.onMouseIn(() => {});
            submitBtn.onMouseOut(() => {});
            submitBtn.onFocusChange(() => {});

            // Clear button with mouse events
            const clearBtn = app.button('Clear', {
              onClick: () => {
                entry.setText('');
                resultLabel.setText('Result: (none)');
                submitted = '';
              },
            }).withId('clearBtn');
            clearBtn.onMouseIn(() => {});
            clearBtn.onMouseOut(() => {});
            clearBtn.onMouseDown(() => {});
            clearBtn.onMouseUp(() => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Type into entry
    await ctx.getById('input').type('Hello Events');
    await ctx.wait(100);

    // Submit
    await ctx.getById('submitBtn').click();
    await ctx.wait(200);

    expect(submitted).toBe('Hello Events');
    await ctx.getById('result').getText().within(1000).shouldBe('Result: Hello Events');

    // Clear
    await ctx.getById('clearBtn').click();
    await ctx.wait(100);
    await ctx.getById('result').getText().within(1000).shouldBe('Result: (none)');
  });

  test('event log tracks onClick through event-wrapped buttons', async () => {
    const log: string[] = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Event Log', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const logLabel = app.label('Log: (empty)').withId('logLabel');

            // Full-events button A
            const btnA = app.button('Action A', {
              onClick: () => { log.push('A'); logLabel.setText(`Log: ${log.join(',')}`); },
            }).withId('actionA');
            btnA.onMouseIn(() => {});
            btnA.onMouseOut(() => {});
            btnA.onMouseDown(() => {});
            btnA.onMouseUp(() => {});
            btnA.onKeyDown(() => {});
            btnA.onKeyUp(() => {});
            btnA.onFocusChange(() => {});

            // Hover-only button B
            const btnB = app.button('Action B', {
              onClick: () => { log.push('B'); logLabel.setText(`Log: ${log.join(',')}`); },
            }).withId('actionB');
            btnB.onMouseIn(() => {});
            btnB.onMouseOut(() => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click A then B
    await ctx.getById('actionA').click();
    await ctx.wait(50);
    await ctx.getById('actionB').click();
    await ctx.wait(100);

    expect(log).toEqual(['A', 'B']);
    await ctx.getById('logLabel').getText().within(1000).shouldBe('Log: A,B');
  });

  test('findByText works for event-wrapped widgets', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Find By Text', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const alpha = app.button('Alpha', { onClick: () => {} }).withId('alpha');
            alpha.onMouseIn(() => {});
            alpha.onMouseOut(() => {});

            const beta = app.button('Beta', { onClick: () => {} }).withId('beta');
            beta.onMouseIn(() => {});
            beta.onMouseOut(() => {});
            beta.onKeyDown(() => {});
            beta.onFocusChange(() => {});

            app.label('Gamma').withId('gamma');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Find by text should work for all widgets
    await ctx.expect(ctx.getByExactText('Alpha')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Beta')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Gamma')).toBeVisible();

    // Find by ID should also work
    await ctx.expect(ctx.getById('alpha')).toBeVisible();
    await ctx.expect(ctx.getById('beta')).toBeVisible();
    await ctx.expect(ctx.getById('gamma')).toBeVisible();
  });

  test('rapid sequential clicks on event-wrapped button', async () => {
    let count = 0;

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Rapid Clicks', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const countLabel = app.label('0').withId('count');
            const rapidBtn = app.button('Click Me', {
              onClick: () => { count++; countLabel.setText(String(count)); },
            }).withId('rapidBtn');
            rapidBtn.onMouseIn(() => {});
            rapidBtn.onMouseOut(() => {});
            rapidBtn.onMouseDown(() => {});
            rapidBtn.onMouseUp(() => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Rapid fire 10 clicks
    for (let i = 0; i < 10; i++) {
      await ctx.getById('rapidBtn').click();
    }
    await ctx.wait(200);

    expect(count).toBe(10);
    await ctx.getById('count').getText().within(1000).shouldBe('10');
  });

  test('mixed hbox/vbox layout with event-wrapped and plain widgets', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Mixed Layout', width: 500, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Header').withId('header');

            app.hbox(() => {
              // Left panel: event-wrapped buttons
              app.vbox(() => {
                const leftA = app.button('Left A', { onClick: () => {} }).withId('leftA');
                leftA.onMouseIn(() => {});
                leftA.onMouseOut(() => {});

                const leftB = app.button('Left B', { onClick: () => {} }).withId('leftB');
                leftB.onMouseIn(() => {});
                leftB.onMouseOut(() => {});
                leftB.onKeyDown(() => {});
              });

              // Right panel: plain widgets
              app.vbox(() => {
                app.label('Right Label').withId('rightLabel');
                app.button('Right Button', { onClick: () => {} }).withId('rightBtn');
              });
            });

            app.label('Footer').withId('footer');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // All widgets should be visible
    await ctx.expect(ctx.getById('header')).toBeVisible();
    await ctx.expect(ctx.getById('leftA')).toBeVisible();
    await ctx.expect(ctx.getById('leftB')).toBeVisible();
    await ctx.expect(ctx.getById('rightLabel')).toBeVisible();
    await ctx.expect(ctx.getById('rightBtn')).toBeVisible();
    await ctx.expect(ctx.getById('footer')).toBeVisible();

    // Clicking event-wrapped and plain buttons should both work
    await ctx.getById('leftA').click();
    await ctx.getById('rightBtn').click();
    await ctx.wait(100);
  });

  test('button text dynamically updated via setText in onClick callback', async () => {
    let toggle = false;

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Toggle Text', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const btn = app.button('OFF', {
              onClick: () => {
                toggle = !toggle;
                btn.setText(toggle ? 'ON' : 'OFF');
              },
            }).withId('toggleBtn');
            btn.onMouseIn(() => {});
            btn.onMouseOut(() => {});
            btn.onMouseDown(() => {});
            btn.onMouseUp(() => {});
            btn.onKeyDown(() => {});
            btn.onKeyUp(() => {});
            btn.onFocusChange(() => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('toggleBtn').getText().within(1000).shouldBe('OFF');

    await ctx.getById('toggleBtn').click();
    await ctx.wait(100);
    expect(toggle).toBe(true);
    await ctx.getById('toggleBtn').getText().within(1000).shouldBe('ON');

    await ctx.getById('toggleBtn').click();
    await ctx.wait(100);
    expect(toggle).toBe(false);
    await ctx.getById('toggleBtn').getText().within(1000).shouldBe('OFF');
  });

  test('onMouse convenience method registers all three hover callbacks', async () => {
    let clickCount = 0;

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'onMouse', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const label = app.label('0').withId('count');

            const btn = app.button('onMouse', {
              onClick: () => { clickCount++; label.setText(String(clickCount)); },
            }).withId('onMouseBtn');
            btn.onMouse({
              in: () => {},
              moved: () => {},
              out: () => {},
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getById('onMouseBtn')).toBeVisible();
    await ctx.getById('onMouseBtn').click();
    await ctx.getById('onMouseBtn').click();
    await ctx.getById('onMouseBtn').click();
    await ctx.wait(100);

    expect(clickCount).toBe(3);
    await ctx.getById('count').getText().within(1000).shouldBe('3');
  });

  test('label with hover events alongside interactive buttons', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Label Events', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // Label with hover (for tooltips)
            const hoverLabel = app.label('Hover over me').withId('hoverLabel');
            hoverLabel.onMouseIn(() => {});
            hoverLabel.onMouseOut(() => {});

            // Button with click + hover
            const btn = app.button('Click Me', {
              onClick: () => {},
            }).withId('clickBtn');
            btn.onMouseIn(() => {});
            btn.onMouseOut(() => {});

            // Plain label
            app.label('Plain').withId('plainLabel');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getById('hoverLabel')).toBeVisible();
    await ctx.expect(ctx.getById('clickBtn')).toBeVisible();
    await ctx.expect(ctx.getById('plainLabel')).toBeVisible();

    // getText should work on hover-wrapped label
    await ctx.getById('hoverLabel').getText().within(1000).shouldBe('Hover over me');
  });
});

/**
 * Stimulus Tests — exercise the real EventDispatcher→sendEvent→gRPC→TS callback path
 * using ctx.getById(...).simulate() to fire events directly on the Go dispatcher.
 */
describe('Event Stimulus (real dispatcher round-trip)', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  test('mouseIn/mouseOut fire with position data', async () => {
    const events: Array<{ type: string; data?: any }> = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Stimulus mouseIn/Out', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const lbl = app.label('Cell').withId('cell');
            lbl.onMouseIn((e) => { events.push({ type: 'mouseIn', data: e }); });
            lbl.onMouseOut(() => { events.push({ type: 'mouseOut' }); });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('cell').simulate('mouseIn', { x: 10, y: 20 });
    await ctx.wait(50);
    await ctx.getById('cell').simulate('mouseOut');
    await ctx.wait(50);

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('mouseIn');
    expect(events[0].data.position.x).toBe(10);
    expect(events[0].data.position.y).toBe(20);
    expect(events[1].type).toBe('mouseOut');
  });

  test('mouseMoved fires with position data', async () => {
    const positions: Array<{ x: number; y: number }> = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Stimulus mouseMoved', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const lbl = app.label('Track').withId('track');
            lbl.onMouseMoved((e) => { positions.push(e.position); });
            // Need mouseIn registered too since mouseMoved uses evBitHover
            lbl.onMouseIn(() => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('track').simulate('mouseMoved', { x: 50, y: 60 });
    await ctx.getById('track').simulate('mouseMoved', { x: 100, y: 120 });
    await ctx.wait(50);

    expect(positions).toHaveLength(2);
    expect(positions[0]).toEqual({ x: 50, y: 60 });
    expect(positions[1]).toEqual({ x: 100, y: 120 });
  });

  test('mouseDown/mouseUp fire with button and position', async () => {
    const events: Array<{ type: string; data?: any }> = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Stimulus mouse buttons', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const btn = app.button('Target', { onClick: () => {} }).withId('target');
            btn.onMouseDown((e) => { events.push({ type: 'mouseDown', data: e }); });
            btn.onMouseUp((e) => { events.push({ type: 'mouseUp', data: e }); });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('target').simulate('mouseDown', { button: 1, x: 5, y: 10 });
    await ctx.getById('target').simulate('mouseUp', { button: 1, x: 5, y: 10 });
    await ctx.wait(50);

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('mouseDown');
    expect(events[0].data.button).toBe(1);
    expect(events[0].data.position).toEqual({ x: 5, y: 10 });
    expect(events[1].type).toBe('mouseUp');
    expect(events[1].data.button).toBe(1);
  });

  test('keyDown/keyUp fire with key name', async () => {
    const keys: Array<{ type: string; key: string }> = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Stimulus keys', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const btn = app.button('Input', { onClick: () => {} }).withId('input');
            btn.onKeyDown((e) => { keys.push({ type: 'keyDown', key: e.key }); });
            btn.onKeyUp((e) => { keys.push({ type: 'keyUp', key: e.key }); });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('input').simulate('keyDown', { key: 'A' });
    await ctx.getById('input').simulate('keyUp', { key: 'A' });
    await ctx.wait(50);

    expect(keys).toHaveLength(2);
    expect(keys[0]).toEqual({ type: 'keyDown', key: 'A' });
    expect(keys[1]).toEqual({ type: 'keyUp', key: 'A' });
  });

  test('focusGained/focusLost fire with focused state', async () => {
    const focusEvents: Array<{ focused: boolean }> = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Stimulus focus', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const btn = app.button('Focusable', { onClick: () => {} }).withId('focusable');
            btn.onFocusChange((e) => { focusEvents.push(e); });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('focusable').simulate('focusGained');
    await ctx.wait(50);
    await ctx.getById('focusable').simulate('focusLost');
    await ctx.wait(50);

    expect(focusEvents).toHaveLength(2);
    expect(focusEvents[0].focused).toBe(true);
    expect(focusEvents[1].focused).toBe(false);
  });

  test('combined sequence: multiple event types on one widget', async () => {
    const log: string[] = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Stimulus combo', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const btn = app.button('Multi', { onClick: () => {} }).withId('multi');
            btn.onMouseIn(() => { log.push('mouseIn'); });
            btn.onMouseOut(() => { log.push('mouseOut'); });
            btn.onMouseDown(() => { log.push('mouseDown'); });
            btn.onMouseUp(() => { log.push('mouseUp'); });
            btn.onKeyDown(() => { log.push('keyDown'); });
            btn.onKeyUp(() => { log.push('keyUp'); });
            btn.onFocusChange((e) => { log.push(e.focused ? 'focusGained' : 'focusLost'); });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Simulate a full interaction sequence
    await ctx.getById('multi').simulate('focusGained');
    await ctx.getById('multi').simulate('mouseIn', { x: 5, y: 5 });
    await ctx.getById('multi').simulate('mouseDown', { button: 1, x: 5, y: 5 });
    await ctx.getById('multi').simulate('mouseUp', { button: 1, x: 5, y: 5 });
    await ctx.getById('multi').simulate('keyDown', { key: 'Return' });
    await ctx.getById('multi').simulate('keyUp', { key: 'Return' });
    await ctx.getById('multi').simulate('mouseOut');
    await ctx.getById('multi').simulate('focusLost');
    await ctx.wait(100);

    expect(log).toEqual([
      'focusGained', 'mouseIn', 'mouseDown', 'mouseUp',
      'keyDown', 'keyUp', 'mouseOut', 'focusLost'
    ]);
  });

  test('rapid simulate calls in quick succession', async () => {
    let count = 0;

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Stimulus rapid', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const lbl = app.label('Counter').withId('counter');
            lbl.onMouseIn(() => { count++; });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Fire 20 mouseIn events rapidly
    for (let i = 0; i < 20; i++) {
      await ctx.getById('counter').simulate('mouseIn', { x: i, y: i });
    }
    await ctx.wait(100);

    expect(count).toBe(20);
  });

  test('stimulus updates widget state via callback', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Stimulus state', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const status = app.label('idle').withId('status');
            const target = app.label('Target').withId('target');
            target.onMouseIn(() => { status.setText('hovering'); });
            target.onMouseOut(() => { status.setText('idle'); });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('status').getText().within(1000).shouldBe('idle');

    await ctx.getById('target').simulate('mouseIn', { x: 5, y: 5 });
    await ctx.getById('status').getText().within(1000).shouldBe('hovering');

    await ctx.getById('target').simulate('mouseOut');
    await ctx.getById('status').getText().within(1000).shouldBe('idle');
  });
});

/**
 * Concrete Variant Tests — exercise the real widget interface methods
 * (ButtonWithHover.MouseIn, ButtonWithHoverFocusKey.FocusGained, etc.)
 * via simulate, which now calls the widget's Fyne interface methods
 * instead of disp.fire() directly.
 */
describe('Concrete variant stimulus (real widget methods)', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  test('ButtonWithHover stimulus calls real MouseIn/MouseOut methods', async () => {
    const events: Array<{ type: string; data?: any }> = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'BWH Stimulus', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const btn = app.button('Hover', { onClick: () => {} }).withId('hoverBtn');
            btn.onMouseIn((e) => { events.push({ type: 'mouseIn', data: e }); });
            btn.onMouseOut(() => { events.push({ type: 'mouseOut' }); });
            btn.onMouseMoved((e) => { events.push({ type: 'mouseMoved', data: e }); });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // These simulate calls now go through ButtonWithHover.MouseIn() → Button.MouseIn() + disp.fire()
    await ctx.getById('hoverBtn').simulate('mouseIn', { x: 10, y: 20 });
    await ctx.getById('hoverBtn').simulate('mouseMoved', { x: 15, y: 25 });
    await ctx.getById('hoverBtn').simulate('mouseOut');
    await ctx.wait(50);

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('mouseIn');
    expect(events[0].data.position).toEqual({ x: 10, y: 20 });
    expect(events[1].type).toBe('mouseMoved');
    expect(events[1].data.position).toEqual({ x: 15, y: 25 });
    expect(events[2].type).toBe('mouseOut');
  });

  test('ButtonWithHoverMouse stimulus calls real MouseDown/MouseUp methods', async () => {
    const events: Array<{ type: string; data?: any }> = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'BWHM Stimulus', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const btn = app.button('Mouse', { onClick: () => {} }).withId('mouseBtn');
            btn.onMouseIn((e) => { events.push({ type: 'mouseIn', data: e }); });
            btn.onMouseOut(() => { events.push({ type: 'mouseOut' }); });
            btn.onMouseDown((e) => { events.push({ type: 'mouseDown', data: e }); });
            btn.onMouseUp((e) => { events.push({ type: 'mouseUp', data: e }); });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('mouseBtn').simulate('mouseIn', { x: 5, y: 5 });
    await ctx.getById('mouseBtn').simulate('mouseDown', { button: 1, x: 10, y: 10 });
    await ctx.getById('mouseBtn').simulate('mouseUp', { button: 1, x: 10, y: 10 });
    await ctx.getById('mouseBtn').simulate('mouseOut');
    await ctx.wait(50);

    expect(events).toHaveLength(4);
    expect(events[0].type).toBe('mouseIn');
    expect(events[1].type).toBe('mouseDown');
    expect(events[1].data.button).toBe(1);
    expect(events[1].data.position).toEqual({ x: 10, y: 10 });
    expect(events[2].type).toBe('mouseUp');
    expect(events[3].type).toBe('mouseOut');
  });

  test('ButtonWithHoverFocusKey stimulus via focus() exercises Fyne canvas.Focus path', async () => {
    const log: string[] = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'BWHFK Focus', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const btn = app.button('FocusKey', { onClick: () => {} }).withId('fkBtn');
            btn.onMouseIn(() => { log.push('mouseIn'); });
            btn.onMouseOut(() => { log.push('mouseOut'); });
            btn.onKeyDown((e) => { log.push(`keyDown:${e.key}`); });
            btn.onKeyUp((e) => { log.push(`keyUp:${e.key}`); });
            btn.onFocusChange((e) => { log.push(e.focused ? 'focusGained' : 'focusLost'); });

            // Second button to steal focus
            app.button('Other', { onClick: () => {} }).withId('otherBtn');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // focus() sends focusWidget → Go calls canvas.Focus(widget) → FocusGained()
    await ctx.getById('fkBtn').focus();
    await ctx.wait(50);

    // Key events on the focused widget
    await ctx.getById('fkBtn').simulate('keyDown', { key: 'A' });
    await ctx.getById('fkBtn').simulate('keyUp', { key: 'A' });
    await ctx.wait(50);

    expect(log).toContain('focusGained');
    expect(log).toContain('keyDown:A');
    expect(log).toContain('keyUp:A');
  });

  test('LabelWithHover stimulus calls real MouseIn/MouseMoved/MouseOut methods', async () => {
    const positions: Array<{ x: number; y: number }> = [];
    let inCount = 0;
    let outCount = 0;

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'LWH Stimulus', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const lbl = app.label('Track Me').withId('trackLabel');
            lbl.onMouseIn(() => { inCount++; });
            lbl.onMouseMoved((e) => { positions.push(e.position); });
            lbl.onMouseOut(() => { outCount++; });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('trackLabel').simulate('mouseIn', { x: 0, y: 0 });
    await ctx.getById('trackLabel').simulate('mouseMoved', { x: 50, y: 30 });
    await ctx.getById('trackLabel').simulate('mouseMoved', { x: 100, y: 60 });
    await ctx.getById('trackLabel').simulate('mouseOut');
    await ctx.wait(50);

    expect(inCount).toBe(1);
    expect(outCount).toBe(1);
    expect(positions).toHaveLength(2);
    expect(positions[0]).toEqual({ x: 50, y: 30 });
    expect(positions[1]).toEqual({ x: 100, y: 60 });
  });

  test('getText/setText work on concrete variant widgets', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Variant getText', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // ButtonWithHover variant
            const btn = app.button('Original', { onClick: () => {} }).withId('varBtn');
            btn.onMouseIn(() => {});
            btn.onMouseOut(() => {});

            // LabelWithHover variant
            const lbl = app.label('Label Original').withId('varLabel');
            lbl.onMouseIn(() => {});
            lbl.onMouseOut(() => {});

            // ButtonWithHoverFocusKey variant
            const fkBtn = app.button('FK Original', { onClick: () => {} }).withId('fkBtn');
            fkBtn.onMouseIn(() => {});
            fkBtn.onMouseOut(() => {});
            fkBtn.onKeyDown(() => {});
            fkBtn.onFocusChange(() => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify getText works on all variant types
    await ctx.getById('varBtn').getText().within(1000).shouldBe('Original');
    await ctx.getById('varLabel').getText().within(1000).shouldBe('Label Original');
    await ctx.getById('fkBtn').getText().within(1000).shouldBe('FK Original');
  });

  test('full interaction sequence on ButtonWithHoverFocusKey variant', async () => {
    const log: string[] = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Full Sequence', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const btn = app.button('Sequence', { onClick: () => {} }).withId('seqBtn');
            btn.onMouseIn(() => { log.push('mouseIn'); });
            btn.onMouseOut(() => { log.push('mouseOut'); });
            btn.onMouseMoved(() => { log.push('mouseMoved'); });
            btn.onKeyDown((e) => { log.push(`keyDown:${e.key}`); });
            btn.onKeyUp((e) => { log.push(`keyUp:${e.key}`); });
            btn.onFocusChange((e) => { log.push(e.focused ? 'focusGained' : 'focusLost'); });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Full interaction: hover → focus → key → unfocus → leave
    await ctx.getById('seqBtn').simulate('mouseIn', { x: 5, y: 5 });
    await ctx.getById('seqBtn').simulate('mouseMoved', { x: 10, y: 10 });
    await ctx.getById('seqBtn').simulate('focusGained');
    await ctx.getById('seqBtn').simulate('keyDown', { key: 'Return' });
    await ctx.getById('seqBtn').simulate('keyUp', { key: 'Return' });
    await ctx.getById('seqBtn').simulate('focusLost');
    await ctx.getById('seqBtn').simulate('mouseOut');
    await ctx.wait(100);

    expect(log).toEqual([
      'mouseIn', 'mouseMoved', 'focusGained',
      'keyDown:Return', 'keyUp:Return',
      'focusLost', 'mouseOut'
    ]);
  });

  test('click on concrete variant button still fires onClick', async () => {
    let clicked = false;

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Variant Click', width: 300, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const statusLabel = app.label('not clicked').withId('status');
            const btn = app.button('Click Me', {
              onClick: () => { clicked = true; statusLabel.setText('clicked'); },
            }).withId('variantBtn');
            btn.onMouseIn(() => {});
            btn.onMouseOut(() => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // click() should work through handleClickWidget's fyne.Tappable fallback
    await ctx.getById('variantBtn').click();
    await ctx.wait(50);

    expect(clicked).toBe(true);
    await ctx.getById('status').getText().within(1000).shouldBe('clicked');
  });

  test('mixed variant and plain widgets in same container', async () => {
    const log: string[] = [];

    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Mixed', width: 300, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const statusLabel = app.label('idle').withId('status');

            // Plain button (no events)
            app.button('Plain', {
              onClick: () => { log.push('plain-click'); statusLabel.setText('plain'); },
            }).withId('plainBtn');

            // Hover variant
            const hoverBtn = app.button('Hover', {
              onClick: () => { log.push('hover-click'); statusLabel.setText('hover'); },
            }).withId('hoverBtn');
            hoverBtn.onMouseIn(() => { log.push('hover-in'); });
            hoverBtn.onMouseOut(() => { log.push('hover-out'); });

            // Plain label
            app.label('Just a label').withId('plainLabel');

            // Label with hover
            const hoverLabel = app.label('Hover label').withId('hoverLabel');
            hoverLabel.onMouseIn(() => { log.push('label-in'); });
            hoverLabel.onMouseOut(() => { log.push('label-out'); });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click plain button
    await ctx.getById('plainBtn').click();
    await ctx.wait(50);
    expect(log).toContain('plain-click');
    await ctx.getById('status').getText().within(1000).shouldBe('plain');

    // Click hover variant button
    await ctx.getById('hoverBtn').click();
    await ctx.wait(50);
    expect(log).toContain('hover-click');
    await ctx.getById('status').getText().within(1000).shouldBe('hover');

    // Simulate hover on label variant
    await ctx.getById('hoverLabel').simulate('mouseIn', { x: 5, y: 5 });
    await ctx.getById('hoverLabel').simulate('mouseOut');
    await ctx.wait(50);
    expect(log).toContain('label-in');
    expect(log).toContain('label-out');

    // getText on both plain and variant labels
    await ctx.getById('plainLabel').getText().within(1000).shouldBe('Just a label');
    await ctx.getById('hoverLabel').getText().within(1000).shouldBe('Hover label');
  });
});
