/**
 * Sonic3 App - File compression and archive management
 * @tsyne-app:name Sonic3
 * @tsyne-app:builder buildSonic3App
 * @tsyne-app:args app,win
 */

import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';

interface Archive {
  id: string;
  name: string;
  format: string;
  size: number;
  encrypted: boolean;
}

class Sonic3UI {
  private state = { archives: [], selectedId: null as string | null };

  constructor(private a: App) {
    const json = this.a.getPreference('sonic3_archives', '[]');
    Promise.resolve(json).then((j: string) => {
      try { this.state.archives = JSON.parse(j); } catch { }
    });
  }

  buildUI(win: Window): void {
    this.a.vbox(() => {
      this.a.label('Sonic3 - Archive Manager').withId('sonic3Title');
      this.a.separator();
      
      if (this.state.archives.length === 0) {
        this.a.label('No archives').withId('sonic3Empty');
      } else {
        this.a.scroll(() => {
          this.a.vbox(() => {
            this.state.archives.forEach((arc: any) => {
              this.a.label(`${arc.name} (${arc.format})`).withId(`sonic3-${arc.id}`);
            });
          });
        });
      }
    });
  }

  getArchives(): ReadonlyArray<Archive> { return [...this.state.archives]; }
}

export function buildSonic3App(a: App, win: Window): Sonic3UI {
  const ui = new Sonic3UI(a);
  win.setContent(() => ui.buildUI(win));
  return ui;
}

if (require.main === module) {
  const { app } = require('./index');
  app({ title: 'Sonic3' }, (a: App) => {
    a.window({ title: 'Sonic3', width: 600, height: 800 }, (win: Window) => {
      buildSonic3App(a, win);
    });
  });
}
