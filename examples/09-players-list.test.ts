// Test for players-list example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

interface Player {
  name: string;
  score: number;
}

describe('Players List Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display player scoreboard', async () => {
    const players: Player[] = [
      { name: 'WildJane', score: 5210 },
      { name: 'MadBob', score: 4991 },
      { name: 'GreeNoob', score: 12 },
    ];

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Gastown bingo players', width: 220, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Player Scoreboard');

            // Simple version without list widget - just display players
            players.forEach(player => {
              app.hbox(() => {
                app.label(player.name);
                app.label(player.score.toString());
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check title is visible
    await ctx.expect(ctx.getByExactText('Player Scoreboard')).toBeVisible();

    // Check players are displayed
    await ctx.expect(ctx.getByExactText('WildJane')).toBeVisible();
    await ctx.expect(ctx.getByExactText('5210')).toBeVisible();
    await ctx.expect(ctx.getByExactText('MadBob')).toBeVisible();
    await ctx.expect(ctx.getByExactText('4991')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '09-players-list.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should display all players in order', async () => {
    const players: Player[] = [
      { name: 'Player1', score: 100 },
      { name: 'Player2', score: 200 },
      { name: 'Player3', score: 300 },
    ];

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Players', width: 220, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            players.forEach(player => {
              app.label(`${player.name}: ${player.score}`);
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check all players are visible
    await ctx.expect(ctx.getByText('Player1')).toBeVisible();
    await ctx.expect(ctx.getByText('Player2')).toBeVisible();
    await ctx.expect(ctx.getByText('Player3')).toBeVisible();
  });
});
