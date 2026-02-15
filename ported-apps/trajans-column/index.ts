/**
 * Trajan's Column Interactive Diagram
 *
 * Ported from cosyne/test/svg/Trajans-Column-lower-animated.svg
 * Shows a 3D isometric diagram of Trajan's Column with interactive blocks.
 * Click a block to reveal wire-frame construction lines underneath.
 *
 * Uses CVG for vector rendering with when() predicates for interactivity.
 */

/*
 * @tsyne-app:name Trajan's Column
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="#8B7355"><rect x="9" y="2" width="6" height="20" rx="1"/><rect x="7" y="20" width="10" height="2" rx="0.5"/><rect x="10" y="4" width="4" height="2" fill="#D4BFA8"/><rect x="10" y="8" width="4" height="2" fill="#D4BFA8"/><rect x="10" y="12" width="4" height="2" fill="#D4BFA8"/></svg>
 * @tsyne-app:category education
 * @tsyne-app:builder createTrajansColumnApp
 * @tsyne-app:args app
 * @tsyne-app:count many
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { cvg } from 'cosyne';
import type { CvgContext } from 'cosyne';
import { renderColumn } from './column-geometry';
import type { ColumnState } from './column-geometry';

class TrajansColumnUI {
  private a: App;
  private cvgCtx: CvgContext = null as any;
  private state: ColumnState = { activeBlock: null };
  private statusLabel: any = null;

  constructor(a: App) {
    this.a = a;
  }

  private handleBlockClick(blockId: string): void {
    // Toggle: click same block again to deselect
    if (this.state.activeBlock === blockId) {
      this.state.activeBlock = null;
      this.updateStatus('Click a block to explore');
    } else {
      this.state.activeBlock = blockId;
      this.updateStatus(`Exploring ${this.formatBlockName(blockId)}`);
    }
    this.cvgCtx.refresh();
  }

  private formatBlockName(blockId: string): string {
    // block1a → "Block 1A"
    const match = blockId.match(/block(\d+)([ab]?)/);
    if (!match) return blockId;
    return `Block ${match[1]}${match[2].toUpperCase()}`;
  }

  private updateStatus(message: string): void {
    if (this.statusLabel) {
      this.statusLabel.setText(message);
    }
  }

  buildUI(win: Window): void {
    this.a.vbox(() => {
      this.statusLabel = this.a.label('Click a block to explore');

      this.cvgCtx = cvg(this.a, {
        viewBox: '0 0 1000 1100',
        width: 800, height: 880,
      }, (s) => {
        renderColumn(s, this.state, (blockId) => this.handleBlockClick(blockId));
      });
    }, { spacing: 0 });
  }

  // ── Test helpers ──

  public getState(): ColumnState {
    return { ...this.state };
  }

  public clickBlock(blockId: string): void {
    this.handleBlockClick(blockId);
  }

  public getActiveBlock(): string | null {
    return this.state.activeBlock;
  }
}

/**
 * Create the Trajan's Column app
 */
export async function createTrajansColumnApp(a: App): Promise<TrajansColumnUI> {
  const ui = new TrajansColumnUI(a);

  a.window({ title: "Trajan's Column" }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

/**
 * Main application entry point - standalone execution
 */
if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: "Trajan's Column" }, async (a: App) => {
    await createTrajansColumnApp(a);
    appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
  });
}
