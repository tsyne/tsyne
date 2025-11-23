/**
 * Photo Gallery Demo - Demonstrates AdaptiveGrid and Padded containers
 *
 * AdaptiveGrid creates a responsive grid where items resize to fill
 * available space while maintaining the specified number of columns.
 *
 * Padded adds theme-aware padding around content.
 */
import { app } from '../src';

// Create a simple photo gallery with colored placeholder cards
app({ title: 'Photo Gallery' }, (a) => {
  a.window({ title: 'Photo Gallery - AdaptiveGrid Demo', width: 800, height: 600 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header with padded content
        a.padded(() => {
          a.vbox(() => {
            a.label('Photo Gallery', undefined, 'center', undefined, { bold: true });
            a.label('Resize the window to see the adaptive grid in action', undefined, 'center');
          });
        });

        a.separator();

        // Main gallery using scroll and adaptive grid
        a.scroll(() => {
          a.padded(() => {
            // AdaptiveGrid with 3 columns minimum
            // Items will resize to fill available width
            a.adaptivegrid(3, () => {
              // Create gallery items with different "photos" (colored cards)
              const photos = [
                { title: 'Sunset Beach', color: '#FF6B6B' },
                { title: 'Mountain View', color: '#4ECDC4' },
                { title: 'City Lights', color: '#45B7D1' },
                { title: 'Forest Path', color: '#96CEB4' },
                { title: 'Ocean Wave', color: '#4A90D9' },
                { title: 'Desert Dune', color: '#F7DC6F' },
                { title: 'Autumn Leaves', color: '#E67E22' },
                { title: 'Snow Peak', color: '#BDC3C7' },
                { title: 'Lavender Field', color: '#9B59B6' },
                { title: 'Golden Hour', color: '#F39C12' },
                { title: 'Misty Morning', color: '#7F8C8D' },
                { title: 'Spring Bloom', color: '#2ECC71' },
              ];

              for (const photo of photos) {
                // Each gallery item is a card with padded content
                a.card(photo.title, 'Click to view', () => {
                  a.padded(() => {
                    a.vbox(() => {
                      // Placeholder for image (button with color name)
                      a.button(`[${photo.color}]`, () => {
                        console.log(`Viewing: ${photo.title}`);
                      });
                      a.label(photo.title, undefined, 'center');
                    });
                  });
                });
              }
            });
          });
        });

        // Footer with info
        a.separator();
        a.padded(() => {
          a.label('12 photos in gallery', undefined, 'center');
        });
      });
    });

    win.show();
  });
});
