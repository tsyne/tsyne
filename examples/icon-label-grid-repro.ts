/**
 * Reproduction of the folder app icon problem
 *
 * The issue: In desktop folder windows, labels appear vertically detached from icons.
 *
 * ROOT CAUSE: When grid cells are larger than needed (due to cellSize or expansion),
 * the layout of icon+label within the cell determines whether a gap appears.
 *
 * PROBLEM layout: vbox { center(icon), spacer, label } - creates huge gap
 * CORRECT layout: vbox { hbox(spacer,icon,spacer), label, spacer } - keeps icon+label together
 *
 * Run: npx tsx examples/icon-label-grid-repro.ts
 */

import { app, resolveTransport, App } from 'tsyne';
import * as path from 'path';

// Mock folder apps with 80x80 SVG icons (matching desktop icon size)
const FOLDER_APPS = [
  { name: 'Daily Checklist', icon: 'test-icon-80.svg' },
  { name: 'Daily Checklist MVC', icon: 'test-icon-80.svg' },
  { name: 'Slydes', icon: 'test-icon-80-computer.svg' },
  { name: 'TodoMVC', icon: 'test-icon-80.svg' },
];

export function buildIconLabelGridRepro(a: App) {
  // Minimal desktop-alike using DesktopMDI - exactly like desktop.ts
  a.window({ title: 'Mini Desktop', width: 800, height: 600 }, (win) => {
    win.setContent(() => {
      // Create DesktopMDI - exactly like desktop.ts line 204
      const desktopMDI = a.desktopMDI({ bgColor: '#2d5a87' });

      // Pre-open the Productivity folder window - exactly like openFolderWindow()
      const cols = 4;
      const rows = Math.ceil(FOLDER_APPS.length / cols);

      const innerWindow = desktopMDI.addWindowWithContent(
        'Productivity (4 apps)',
        () => {
          // scroll.withMinSize forces minimum window size
          // But does NOT force content expansion (scroll allows natural sizing)
          const scroll = a.scroll(() => {
            a.vbox(() => {
              // Header
              a.center(() => {
                a.label('Productivity', undefined, 'center');
              });
              a.separator();

              // Grid with cellSize to FORCE expanded cells - this reproduces the problem
              a.grid(cols, () => {
                for (let row = 0; row < rows; row++) {
                  for (let col = 0; col < cols; col++) {
                    const index = row * cols + col;
                    if (index < FOLDER_APPS.length) {
                      const appInfo = FOLDER_APPS[index];
                      const iconPath = path.join(__dirname, 'assets', appInfo.icon);
                      // EXACT desktop.ts layout - gap appears when cells are large
                      a.vbox(() => {
                        a.hbox(() => {
                          a.spacer();
                          a.image({
                            path: iconPath,
                            fillMode: 'original'
                          });
                          a.spacer();
                        });
                        a.label(appInfo.name, undefined, 'center');
                        a.spacer();
                      });
                    } else {
                      a.label('');
                    }
                  }
                }
              }, { cellSize: 180 });
            });
          });
          scroll.withMinSize(450, 300);
        }
      );
    });
    win.show();
  });
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Icon Label Grid Repro' }, buildIconLabelGridRepro);
}
