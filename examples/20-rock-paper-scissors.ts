// @tsyne-app:name Rock Paper Scissors
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 10-4 0v5"/><path d="M14 10V4a2 2 0 10-4 0v6"/><path d="M10 10.5V6a2 2 0 10-4 0v8"/><path d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2a8 8 0 01-8-8V9a2 2 0 114 0"/></svg>
// @tsyne-app:category games
// @tsyne-app:builder buildRockPaperScissors

// Rock Paper Scissors - Classic game with score tracking
// Demonstrates game logic, state management, and visual feedback

import { app, resolveTransport, App, Window  , standaloneShutdownStrategy } from 'tsyne';

export function buildRockPaperScissors(a: App) {
  a.window({ title: 'Rock Paper Scissors', width: 400, height: 500 }, (win: Window) => {
    let playerScore = 0;
    let computerScore = 0;
    let ties = 0;
    let resultLabel: any;
    let playerChoiceLabel: any;
    let computerChoiceLabel: any;
    let scoreLabel: any;

    const choices = ['Rock', 'Paper', 'Scissors'];
    const emojis: { [key: string]: string } = {
      'Rock': '✊',
      'Paper': '✋',
      'Scissors': '✌️',
    };

    function play(playerChoice: string) {
      const computerChoice = choices[Math.floor(Math.random() * 3)];

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

      // Update displays
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

    function reset() {
      playerScore = 0;
      computerScore = 0;
      ties = 0;

      if (playerChoiceLabel) playerChoiceLabel.setText('Make your choice!');
      if (computerChoiceLabel) computerChoiceLabel.setText('');
      if (resultLabel) resultLabel.setText('');
      if (scoreLabel) scoreLabel.setText('You: 0 | Computer: 0 | Ties: 0');
    }

    win.setContent(() => {
      a.vbox(() => {
        a.label('✊ ✋ ✌️');
        a.label('Rock Paper Scissors');
        a.separator();

        // Choice buttons
        a.label('Choose your weapon:');
        a.hbox(() => {
          a.button('✊ Rock', { onClick: () => play('Rock') });
          a.button('✋ Paper', { onClick: () => play('Paper') });
          a.button('✌️ Scissors', { onClick: () => play('Scissors') });
        });

        a.separator();

        // Current round display
        playerChoiceLabel = a.label('Make your choice!');
        computerChoiceLabel = a.label('');

        a.separator();

        // Result
        resultLabel = a.label('');

        a.separator();

        // Score
        a.label('═══════════════════');
        scoreLabel = a.label('You: 0 | Computer: 0 | Ties: 0');
        a.label('═══════════════════');

        a.separator();

        // Game rules
        a.label('Rules:');
        a.label('• Rock beats Scissors');
        a.label('• Scissors beats Paper');
        a.label('• Paper beats Rock');

        a.separator();

        // Reset button
        a.button('Reset Score', { onClick: reset });
      });
    });

    win.show();
  });
}

// Standalone execution
if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Rock Paper Scissors' }, buildRockPaperScissors);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));}
