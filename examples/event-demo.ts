// Event System Demo — showcases all event types with console output
//
// Run with:  ./scripts/tsyne examples/event-demo.ts

import { app, resolveTransport, standaloneShutdownStrategy, App, Window } from 'tsyne';

function log(source: string, event: string, detail?: string) {
  const ts = new Date().toISOString().slice(11, 23);
  const msg = detail ? `[${ts}] ${source} → ${event}: ${detail}` : `[${ts}] ${source} → ${event}`;
  console.log(msg);
}

function buildEventDemo(a: App) {
  a.window({ title: 'Event System Demo', width: 500, height: 400 }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {

        // ── Header ──
        a.label('Event Demo — watch your terminal for output');
        a.separator();

        // ── Hover tracking label ──
        a.label('Hover Zone')
          .withId('hoverZone')
          .onMouseIn((e) => {
            log('Hover Zone', 'mouseIn', `pos=(${e.position.x.toFixed(0)}, ${e.position.y.toFixed(0)})`);
          })
          .onMouseMoved((e) => {
            log('Hover Zone', 'mouseMoved', `pos=(${e.position.x.toFixed(0)}, ${e.position.y.toFixed(0)})`);
          })
          .onMouseOut(() => {
            log('Hover Zone', 'mouseOut');
          });

        // ── Click + mouse button tracking ──
        let clickCount = 0;
        const clickLabel = a.label('Click count: 0').withId('clickCount');

        a.button('Click Me', {
          onClick: () => {
            clickCount++;
            clickLabel.setText(`Click count: ${clickCount}`);
            log('Click Me', 'onClick', `count=${clickCount}`);
          },
        })
          .withId('clickBtn')
          .onMouseDown((e) => {
            log('Click Me', 'mouseDown', `button=${e.button} pos=(${e.position.x.toFixed(0)}, ${e.position.y.toFixed(0)})`);
          })
          .onMouseUp((e) => {
            log('Click Me', 'mouseUp', `button=${e.button} pos=(${e.position.x.toFixed(0)}, ${e.position.y.toFixed(0)})`);
          })
          .onMouseIn((e) => {
            log('Click Me', 'mouseIn', `pos=(${e.position.x.toFixed(0)}, ${e.position.y.toFixed(0)})`);
          })
          .onMouseOut(() => {
            log('Click Me', 'mouseOut');
          });

        a.separator();

        // ── Focus + keyboard tracking ──
        a.label('Focus & Key Tracking:');

        const focusStatus = a.label('Focus: none').withId('focusStatus');
        const keyStatus = a.label('Last key: none').withId('keyStatus');

        a.button('Focusable Button (click, then type)', {
          onClick: () => log('Focusable', 'onClick'),
        })
          .withId('focusBtn')
          .onMouseIn((e) => {
            log('Focusable', 'mouseIn', `pos=(${e.position.x.toFixed(0)}, ${e.position.y.toFixed(0)})`);
          })
          .onMouseOut(() => {
            log('Focusable', 'mouseOut');
          })
          .onFocusChange((e) => {
            const state = e.focused ? 'gained' : 'lost';
            focusStatus.setText(`Focus: ${state}`);
            log('Focusable', e.focused ? 'focusGained' : 'focusLost');
          })
          .onKeyDown((e) => {
            keyStatus.setText(`Last key: ${e.key} (down)`);
            log('Focusable', 'keyDown', `key=${e.key}`);
          })
          .onKeyUp((e) => {
            keyStatus.setText(`Last key: ${e.key} (up)`);
            log('Focusable', 'keyUp', `key=${e.key}`);
          });

        a.separator();

        // ── Multiple buttons in a row ──
        a.label('Button Row (hover + click):');

        a.hbox(() => {
          for (const color of ['Red', 'Green', 'Blue']) {
            a.button(color, {
              onClick: () => log(color, 'onClick'),
            })
              .withId(`btn${color}`)
              .onMouseIn(() => log(color, 'mouseIn'))
              .onMouseOut(() => log(color, 'mouseOut'));
          }
        });

      });
    });
    win.show();
  });
}

const appInstance = app(resolveTransport(), { title: 'Event Demo' }, buildEventDemo);
appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
