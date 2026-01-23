/**
 * SSH Terminal App - Terminal emulation
 * @tsyne-app:name SSH Terminal
 * @tsyne-app:builder buildSSHTermApp
 * @tsyne-app:args app,win
 */

import type { App } from 'tsyne';
import type { Window } from 'tsyne';

interface Session {
  id: string;
  host: string;
  port: number;
  username: string;
  connected: boolean;
}

class SSHTermUI {
  private state = { sessions: [] as Session[], selectedId: null as string | null };

  constructor(private a: App) {
    const json = this.a.getPreference('sshterm_sessions', '[]');
    Promise.resolve(json).then((j: string) => {
      try { this.state.sessions = JSON.parse(j); } catch { }
    });
  }

  buildUI(win: Window): void {
    this.a.vbox(() => {
      this.a.label('SSH Terminal').withId('sshtermTitle');
      this.a.separator();
      
      if (this.state.sessions.length === 0) {
        this.a.label('No SSH sessions').withId('sshtermEmpty');
      } else {
        this.a.scroll(() => {
          this.a.vbox(() => {
            this.state.sessions.forEach((s: Session) => {
              this.a.label(`${s.username}@${s.host}:${s.port}`).withId(`sshterm-${s.id}`);
            });
          });
        });
      }
    });
  }

  getSessions(): ReadonlyArray<Session> { return [...this.state.sessions]; }
}

export function buildSSHTermApp(a: App, win: Window): SSHTermUI {
  const ui = new SSHTermUI(a);
  win.setContent(() => ui.buildUI(win));
  return ui;
}

if (require.main === module) {
  const { app, resolveTransport  } = require('./index');
  app(resolveTransport(), { title: 'SSH Terminal' }, (a: App) => {
    a.window({ title: 'SSH Terminal', width: 800, height: 600 }, (win: Window) => {
      buildSSHTermApp(a, win);
    });
  });
}
