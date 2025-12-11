/**
 * Desktop Canvas Demo
 *
 * Demonstrates draggable icons with double-click support.
 * This solves Fyne's Stack click limitation by using a single
 * widget with absolute positioning.
 *
 * @tsyne-app
 * @name Desktop Canvas Demo
 * @description Draggable icons demo
 */

import { app, App } from '../core/src';

export async function build(a: App) {
  a.window({ title: 'Desktop Canvas Demo', width: 800, height: 600 }, (win) => {
    win.setContent(() => {
      // Create a desktop canvas with dark blue background
      const canvas = a.desktopCanvas({ bgColor: '#1e3c5a' });

      // Add some icons
      const iconColors = ['#dc3232', '#32b432', '#3264dc', '#dcb432', '#b432b4', '#32b4b4'];
      const iconNames = ['Documents', 'Pictures', 'Terminal', 'Settings', 'Browser', 'Trash'];

      iconNames.forEach((name, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);

        canvas.addIcon({
          id: `icon-${i + 1}`,
          label: name,
          x: 50 + col * 120,
          y: 50 + row * 120,
          color: iconColors[i],
          onClick: (iconId, x, y) => {
            console.log(`Clicked: ${name} at (${x}, ${y})`);
          },
          onDoubleClick: (iconId, x, y) => {
            console.log(`DOUBLE-CLICK: ${name} - would launch app!`);
          },
          onDrag: (iconId, x, y, dx, dy) => {
            // console.log(`Dragging ${name} to (${x}, ${y})`);
          },
          onDragEnd: (iconId, x, y) => {
            console.log(`Dropped ${name} at (${x}, ${y})`);
          }
        });
      });
    });
  });
}

// Run if executed directly
if (require.main === module) {
  app({ title: 'Desktop Canvas Demo' }, build);
}
