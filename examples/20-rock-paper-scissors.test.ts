// Test for Rock Paper Scissors example
import { TsyneTest, TestContext } from '../core/src/index-test';
import * as path from 'path';

describe('Rock Paper Scissors Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial UI', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Rock Paper Scissors', width: 400, height: 500 }, (win) => {
        let playerScore = 0;
        let computerScore = 0;
        let ties = 0;
        let playerChoiceLabel: any;
        let scoreLabel: any;

        win.setContent(() => {
          app.vbox(() => {
            app.label('✊ ✋ ✌️');
            app.label('Rock Paper Scissors');
            app.separator();

            app.label('Choose your weapon:');
            app.hbox(() => {
              app.button('✊ Rock').onClick(() => {});
              app.button('✋ Paper').onClick(() => {});
              app.button('✌️ Scissors').onClick(() => {});
            });

            app.separator();

            playerChoiceLabel = app.label('Make your choice!');

            app.separator();

            app.label('═══════════════════');
            scoreLabel = app.label('You: 0 | Computer: 0 | Ties: 0');
            app.label('═══════════════════');

            app.separator();

            app.label('Rules:');
            app.label('• Rock beats Scissors');
            app.label('• Scissors beats Paper');
            app.label('• Paper beats Rock');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state
    await ctx.expect(ctx.getByExactText('Make your choice!')).toBeVisible();
    await ctx.expect(ctx.getByExactText('You: 0 | Computer: 0 | Ties: 0')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '20-rock-paper-scissors.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should handle player win (Rock beats Scissors)', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Rock Paper Scissors', width: 400, height: 500 }, (win) => {
        let playerScore = 0;
        let computerScore = 0;
        let ties = 0;
        let resultLabel: any;
        let playerChoiceLabel: any;
        let computerChoiceLabel: any;
        let scoreLabel: any;

        const emojis: { [key: string]: string } = {
          'Rock': '✊',
          'Paper': '✋',
          'Scissors': '✌️',
        };

        function play(playerChoice: string) {
          // Fixed computer choice for testing
          const computerChoice = 'Scissors' as 'Rock' | 'Paper' | 'Scissors';

          let result = '';
          let resultEmoji = '';

          if (playerChoice === computerChoice) {
            result = "It's a tie!";
            resultEmoji = '🤝';
            ties++;
          } else if (
            (playerChoice === 'Rock' && computerChoice === 'Scissors') ||
            (playerChoice === 'Paper' && computerChoice === 'Rock') ||
            (playerChoice === 'Scissors' && computerChoice === 'Paper')
          ) {
            result = 'You win!';
            resultEmoji = '🎉';
            playerScore++;
          } else {
            result = 'Computer wins!';
            resultEmoji = '😞';
            computerScore++;
          }

          if (playerChoiceLabel) {
            playerChoiceLabel.setText(`You chose: ${emojis[playerChoice]} ${playerChoice}`);
          }
          if (computerChoiceLabel) {
            computerChoiceLabel.setText(`Computer chose: ${emojis[computerChoice]} ${computerChoice}`);
          }
          if (resultLabel) {
            resultLabel.setText(`${resultEmoji} ${result}`);
          }
          if (scoreLabel) {
            scoreLabel.setText(`You: ${playerScore} | Computer: ${computerScore} | Ties: ${ties}`);
          }
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('✊ ✋ ✌️');
            app.label('Rock Paper Scissors');

            app.hbox(() => {
              app.button('✊ Rock').onClick(() => play('Rock'));
              app.button('✋ Paper').onClick(() => play('Paper'));
              app.button('✌️ Scissors').onClick(() => play('Scissors'));
            });

            playerChoiceLabel = app.label('Make your choice!');
            computerChoiceLabel = app.label('');
            resultLabel = app.label('');
            scoreLabel = app.label('You: 0 | Computer: 0 | Ties: 0');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Choose rock (should beat scissors)
    await ctx.getByExactText('✊ Rock').click();
    await ctx.wait(200);

    // Should show player win
    await ctx.expect(ctx.getByExactText('🎉 You win!')).toBeVisible();
    await ctx.expect(ctx.getByExactText('You: 1 | Computer: 0 | Ties: 0')).toBeVisible();
  });

  test('should handle computer win (Paper beats Rock)', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Rock Paper Scissors', width: 400, height: 500 }, (win) => {
        let playerScore = 0;
        let computerScore = 0;
        let ties = 0;
        let resultLabel: any;
        let scoreLabel: any;

        const emojis: { [key: string]: string } = {
          'Rock': '✊',
          'Paper': '✋',
          'Scissors': '✌️',
        };

        function play(playerChoice: string) {
          // Fixed computer choice for testing
          const computerChoice = 'Paper' as 'Rock' | 'Paper' | 'Scissors';

          let result = '';
          let resultEmoji = '';

          if (playerChoice === computerChoice) {
            result = "It's a tie!";
            resultEmoji = '🤝';
            ties++;
          } else if (
            (playerChoice === 'Rock' && computerChoice === 'Scissors') ||
            (playerChoice === 'Paper' && computerChoice === 'Rock') ||
            (playerChoice === 'Scissors' && computerChoice === 'Paper')
          ) {
            result = 'You win!';
            resultEmoji = '🎉';
            playerScore++;
          } else {
            result = 'Computer wins!';
            resultEmoji = '😞';
            computerScore++;
          }

          if (resultLabel) {
            resultLabel.setText(`${resultEmoji} ${result}`);
          }
          if (scoreLabel) {
            scoreLabel.setText(`You: ${playerScore} | Computer: ${computerScore} | Ties: ${ties}`);
          }
        }

        win.setContent(() => {
          app.vbox(() => {
            app.label('✊ ✋ ✌️');

            app.hbox(() => {
              app.button('✊ Rock').onClick(() => play('Rock'));
              app.button('✋ Paper').onClick(() => play('Paper'));
              app.button('✌️ Scissors').onClick(() => play('Scissors'));
            });

            resultLabel = app.label('');
            scoreLabel = app.label('You: 0 | Computer: 0 | Ties: 0');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Choose rock (should lose to paper)
    await ctx.getByExactText('✊ Rock').click();
    await ctx.wait(200);

    // Should show computer win
    await ctx.expect(ctx.getByExactText('😞 Computer wins!')).toBeVisible();
    await ctx.expect(ctx.getByExactText('You: 0 | Computer: 1 | Ties: 0')).toBeVisible();
  });

  test('should handle tie', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Rock Paper Scissors', width: 400, height: 500 }, (win) => {
        let playerScore = 0;
        let computerScore = 0;
        let ties = 0;
        let resultLabel: any;
        let scoreLabel: any;

        function play(playerChoice: string) {
          // Fixed computer choice for testing (same as player)
          const computerChoice = playerChoice;

          let result = '';
          let resultEmoji = '';

          if (playerChoice === computerChoice) {
            result = "It's a tie!";
            resultEmoji = '🤝';
            ties++;
          }

          if (resultLabel) {
            resultLabel.setText(`${resultEmoji} ${result}`);
          }
          if (scoreLabel) {
            scoreLabel.setText(`You: ${playerScore} | Computer: ${computerScore} | Ties: ${ties}`);
          }
        }

        win.setContent(() => {
          app.vbox(() => {
            app.hbox(() => {
              app.button('✊ Rock').onClick(() => play('Rock'));
            });

            resultLabel = app.label('');
            scoreLabel = app.label('You: 0 | Computer: 0 | Ties: 0');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Choose rock (computer also chooses rock)
    await ctx.getByExactText('✊ Rock').click();
    await ctx.wait(200);

    // Should show tie
    await ctx.expect(ctx.getByExactText("🤝 It's a tie!")).toBeVisible();
    await ctx.expect(ctx.getByExactText('You: 0 | Computer: 0 | Ties: 1')).toBeVisible();
  });
});
