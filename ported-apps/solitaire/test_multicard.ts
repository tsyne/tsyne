/**
 * Manual test to demonstrate multi-card sequence moves
 */

import { app } from '../../core/src';
import { createSolitaireApp } from './solitaire';
import { Game, Card, Suit } from './solitaire';

if (require.main === module) {
  app({ title: 'Multi-Card Move Test' }, (a) => {
    const ui = createSolitaireApp(a);

    // Set up a specific game state that demonstrates multi-card moves
    ui.getGame().setupFixedState({
      // Stack 0: King of Spades -> Queen of Hearts -> Jack of Clubs
      // Stack 1: Empty (so we can move the King sequence here)
      // Stack 2: Ace of Diamonds (for moving Queen+Jack onto)
      stacks: [
        [
          new Card(13, Suit.Spades, true),  // King (black)
          new Card(12, Suit.Hearts, true),   // Queen (red)
          new Card(11, Suit.Clubs, true)     // Jack (black)
        ],
        [],  // Empty stack
        [new Card(1, Suit.Diamonds, true)]   // Ace
      ],
      handCards: []
    });

    console.error('\n=== Multi-Card Move Test Setup ===');
    console.error('Stack 0: King♠ → Queen♥ → Jack♣');
    console.error('Stack 1: Empty');
    console.error('Stack 2: Ace♦');
    console.error('\nTry these moves:');
    console.error('1. Click Stack 0, then click Stack 1 → Should move all 3 cards (King + Queen + Jack)');
    console.error('2. Click Stack 0 again, then click empty space → Puts cards back');
    console.error('3. Set up: Move King from Stack 0 to Stack 1 (single card)');
    console.error('4. Now Stack 0 has Queen♥ → Jack♣');
    console.error('5. Click Stack 0, the Jack indicator should show "(2 cards)"');
    console.error('6. The multi-card sequence move is working!');

    setInterval(() => {}, 1000);
  });
}
