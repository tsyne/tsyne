// Portions copyright Ryelang developers (Apache 2.0)
// Players list demonstrating list widget with structured data

import { app, resolveTransport  } from '../core/src';

interface Player {
  name: string;
  score: number;
}

app(resolveTransport(), { title: 'Players List' }, (a) => {
  a.window({ title: 'Gastown bingo players', width: 220, height: 200 }, (win) => {
    const players: Player[] = [
      { name: 'WildJane', score: 5210 },
      { name: 'MadBob', score: 4991 },
      { name: 'GreeNoob', score: 12 },
    ];

    win.setContent(() => {
      a.vbox(() => {
        a.label('Player Scoreboard');
        a.separator();

        a.list(
          () => players.length, // length
          () => {
            // createItem
            return a.hbox(() => {
              a.label('name', 120);
              a.label('score', 80);
            });
          },
          (item: any, index: number) => {
            // updateItem
            const player = players[index];
            const hbox = item;

            // Get the labels from the hbox and update them
            (async () => {
              // Update labels with player data
              // Note: This is a simplified version. In a real implementation,
              // we'd need to access the specific labels within the hbox
              await hbox.setText(`${player.name} - ${player.score}`);
            })();
          }
        );
      });
    });
    win.show();
  });
});
