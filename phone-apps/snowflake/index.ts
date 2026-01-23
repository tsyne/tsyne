/**
 * Snowflake App - Festive Snowflake Visualization
 *
 * A festive application that displays and animates snowflakes.
 * A Christmas gift from the Tsyne community.
 *
 * Portions copyright original team and portions copyright Paul Hammant 2025
 * License: MIT
 *
 * @tsyne-app:name Snowflake
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/></svg>
 * @tsyne-app:category Entertainment
 * @tsyne-app:builder buildSnowflakeApp
 * @tsyne-app:args app,win
 * @tsyne-app:count single
 */

import type { App } from 'tsyne';
import type { Window } from 'tsyne';

interface Snowflake {
  id: string;
  size: number;
  speed: number;
  opacity: number;
}

interface SnowflakeState {
  snowflakes: Snowflake[];
  isAnimating: boolean;
  density: number;
  speed: number;
}

/**
 * Snowflake Visualization App
 */
class SnowflakeUI {
  private window: Window | null = null;
  private state: SnowflakeState = {
    snowflakes: [],
    isAnimating: true,
    density: 50,
    speed: 1,
  };

  private animationInterval: NodeJS.Timeout | null = null;

  constructor(private a: App) {
    this.loadSettings();
    this.generateSnowflakes();
  }

  private loadSettings(): void {
    const density = this.a.getPreference('snowflake_density', '50');
    const speed = this.a.getPreference('snowflake_speed', '1');
    const isAnimating = this.a.getPreference('snowflake_animating', 'true');

    Promise.resolve(density).then((d: string) => {
      this.state.density = parseInt(d) || 50;
    });

    Promise.resolve(speed).then((s: string) => {
      this.state.speed = parseInt(s) || 1;
    });

    Promise.resolve(isAnimating).then((a: string) => {
      this.state.isAnimating = a === 'true';
    });
  }

  private saveSettings(): void {
    this.a.setPreference('snowflake_density', this.state.density.toString());
    this.a.setPreference('snowflake_speed', this.state.speed.toString());
    this.a.setPreference('snowflake_animating', this.state.isAnimating.toString());
  }

  private generateSnowflakes(): void {
    this.state.snowflakes = [];
    const count = Math.max(10, Math.min(100, this.state.density));

    for (let i = 0; i < count; i++) {
      this.state.snowflakes.push({
        id: `snowflake-${i}`,
        size: Math.random() * 4 + 2,
        speed: Math.random() * this.state.speed + 0.5,
        opacity: Math.random() * 0.5 + 0.5,
      });
    }
  }

  private toggleAnimation(): void {
    this.state.isAnimating = !this.state.isAnimating;
    this.saveSettings();
    if (this.state.isAnimating) {
      this.startAnimation();
    } else {
      this.stopAnimation();
    }
    this.refreshUI();
  }

  private setDensity(density: number): void {
    this.state.density = Math.max(10, Math.min(100, density));
    this.generateSnowflakes();
    this.saveSettings();
    this.refreshUI();
  }

  private setSpeed(speed: number): void {
    this.state.speed = Math.max(0.5, Math.min(3, speed));
    this.generateSnowflakes();
    this.saveSettings();
    this.refreshUI();
  }

  private startAnimation(): void {
    if (this.animationInterval) return;
    this.animationInterval = setInterval(() => {
      // Animation update would happen here
      this.refreshUI();
    }, 100);
  }

  private stopAnimation(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }

  private refreshUI(): void {
    if (this.window) {
      this.window.setContent(() => this.buildUI(this.window!));
    }
  }

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      // Title
      this.a.label('❄ Snowflake ❄').withId('snowflakeTitle');
      this.a.label('A festive snowflake visualization').withId('snowflakeSubtitle');

      this.a.separator();

      // Snowflake visualization area
      this.a.vbox(() => {
        this.a.label(`Displaying ${this.state.snowflakes.length} Snowflakes`).withId('snowflakeCount');

        this.a.vbox(() => {
          for (let i = 0; i < Math.min(10, this.state.snowflakes.length); i++) {
            const flake = this.state.snowflakes[i];
            this.a.label(`❄ (Size: ${flake.size.toFixed(1)}, Speed: ${flake.speed.toFixed(1)})`).withId(`snowflake-${flake.id}`);
          }

          if (this.state.snowflakes.length > 10) {
            this.a
              .label(`... and ${this.state.snowflakes.length - 10} more snowflakes`)
              .withId('snowflakeMore');
          }
        });
      });

      this.a.separator();

      // Controls
      this.a.vbox(() => {
        this.a.label('Animation').withId('snowflakeAnimLabel');

        this.a.hbox(() => {
          this.a
            .checkbox(this.state.isAnimating ? 'Animation: ON' : 'Animation: OFF', (checked: boolean) => {
              this.toggleAnimation();
            })
            .withId('snowflakeAnimToggle');
        });

        this.a.separator();

        this.a.label(`Density: ${this.state.density}`).withId('snowflakeDensityLabel');
        this.a.hbox(() => {
          this.a
            .button('-')
            .onClick(() => this.setDensity(this.state.density - 10))
            .withId('snowflakeDensityMinus');

          this.a.spacer();

          this.a
            .button('+')
            .onClick(() => this.setDensity(this.state.density + 10))
            .withId('snowflakeDensityPlus');
        });

        this.a.separator();

        this.a.label(`Speed: ${this.state.speed.toFixed(1)}x`).withId('snowflakeSpeedLabel');
        this.a.hbox(() => {
          this.a
            .button('-')
            .onClick(() => this.setSpeed(this.state.speed - 0.5))
            .withId('snowflakeSpeedMinus');

          this.a.spacer();

          this.a
            .button('+')
            .onClick(() => this.setSpeed(this.state.speed + 0.5))
            .withId('snowflakeSpeedPlus');
        });
      });

      this.a.separator();

      this.a.label('Enjoy the festive snowflakes!').withId('snowflakeFooter');
    });

    if (this.state.isAnimating) {
      this.startAnimation();
    }
  }

  // Public methods for testing
  getSnowflakeCount(): number {
    return this.state.snowflakes.length;
  }

  getDensity(): number {
    return this.state.density;
  }

  getSpeed(): number {
    return this.state.speed;
  }

  isAnimating(): boolean {
    return this.state.isAnimating;
  }

  cleanup(): void {
    this.stopAnimation();
  }
}

/**
 * Create the Snowflake app
 */
export function buildSnowflakeApp(a: App, win: Window): SnowflakeUI {
  const ui = new SnowflakeUI(a);

  win.setContent(() => {
    ui.buildUI(win);
  });

  // Register cleanup to stop animation interval when app shuts down
  a.registerCleanup(() => {
    ui.cleanup();
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport  } = require('./index');
  app(resolveTransport(), { title: 'Snowflake', width: 600, height: 800 }, (a: App) => {
    a.window({ title: 'Snowflake - Festive Visualization', width: 600, height: 800 }, (win: Window) => {
      buildSnowflakeApp(a, win);
    });
  });
}
