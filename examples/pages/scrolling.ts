// Scrolling Demo Page - Demonstrates scrollable content
// URL: http://localhost:3000/scrolling
// Feature: Pages can be scrolled up and down (like web pages)

const { vbox, scroll, label, button, separator } = tsyne;

vbox(() => {
  label('Scrolling Demo');
  label('This page demonstrates scrollable content, just like web pages!');
  separator();

  // Create scrollable content area
  scroll(() => {
    vbox(() => {
      label('');
      label('=== Long Content Below ===');
      label('');

      // Generate lots of content to demonstrate scrolling
      for (let i = 1; i <= 100; i++) {
        label(`Line ${i}: This is a line of text to demonstrate scrolling. Scroll down to see more!`);
      }

      label('');
      label('=== End of Content ===');
      label('');
      label('You scrolled all the way down! 🎉');
      label('');
    });
  });

  separator();
  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
