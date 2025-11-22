// Portions copyright Ryelang developers (Apache 2.0)
// Card Stack Demo - demonstrates the Stack container for Z-layered overlapping UI
// Stack container places widgets on top of each other like a deck of cards

import { app } from '../src';

app({ title: 'Card Stack Demo' }, (a) => {
  a.window({ title: 'Card Stack Demo', width: 600, height: 500 }, (win) => {
    // State to track which card is on top
    let topCardIndex = 2;
    const cardLabels: any[] = [];

    win.setContent(() => {
      a.vbox(() => {
        a.label('Card Stack Demo', undefined, 'center', undefined, { bold: true });
        a.label('Click the buttons below to bring cards to the front', undefined, 'center');
        a.separator();

        // Card control buttons
        a.hbox(() => {
          a.button('Show Card 1', () => {
            topCardIndex = 0;
            updateCardHighlights();
          });
          a.button('Show Card 2', () => {
            topCardIndex = 1;
            updateCardHighlights();
          });
          a.button('Show Card 3', () => {
            topCardIndex = 2;
            updateCardHighlights();
          });
        });

        a.separator();

        // Stack container - cards are layered on top of each other
        // The last card in the builder appears on top (z-order)
        a.stack(() => {
          // Card 1 (bottom) - Red themed
          a.card('Card 1', 'First card in the stack', () => {
            a.vbox(() => {
              const lbl = a.label('This is Card 1');
              cardLabels[0] = lbl;
              a.label('It appears at the bottom of the stack');
              a.label('Cards are layered with later items on top');
            });
          });

          // Card 2 (middle) - Green themed
          a.card('Card 2', 'Second card in the stack', () => {
            a.vbox(() => {
              const lbl = a.label('This is Card 2');
              cardLabels[1] = lbl;
              a.label('It appears in the middle of the stack');
              a.label('Stack is useful for overlays and floating UI');
            });
          });

          // Card 3 (top) - Blue themed
          a.card('Card 3', 'Third card in the stack', () => {
            a.vbox(() => {
              const lbl = a.label('This is Card 3');
              cardLabels[2] = lbl;
              a.label('It appears on top of the stack');
              a.label('The last item in the builder is the topmost');
            });
          });
        });

        a.separator();

        // Status indicator
        const statusLabel = a.label('Currently viewing: Card 3 (top of stack)');

        // Update function to show which card is "active"
        function updateCardHighlights() {
          const cardNames = ['Card 1', 'Card 2', 'Card 3'];
          statusLabel.setText(`Currently viewing: ${cardNames[topCardIndex]}`);

          // Update card labels to indicate selection
          for (let i = 0; i < 3; i++) {
            if (cardLabels[i]) {
              if (i === topCardIndex) {
                cardLabels[i].setText(`This is ${cardNames[i]} (SELECTED)`);
              } else {
                cardLabels[i].setText(`This is ${cardNames[i]}`);
              }
            }
          }
        }
      });
    });
    win.show();
  });
});
