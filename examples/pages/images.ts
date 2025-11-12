// Images Demo Page - Demonstrates image display
// URL: http://localhost:3000/images
// Feature: Display images (like HTML <img> tags)

const { vbox, scroll, label, button, separator, image } = tsyne;

vbox(() => {
  label('Images Demo');
  label('This page demonstrates HTTP image loading with dual-execution discovery');
  separator();

  scroll(() => {
    vbox(() => {
      label('');
      label('Test Image (SVG) - Contain mode:');
      label('');

      // Display test image in contain mode
      image('/assets/test-image.svg', 'contain');

      label('');
      separator();
      label('');

      label('Test Image (SVG) - Stretch mode:');
      label('');

      // Display test image in stretch mode
      image('/assets/test-image.svg', 'stretch');

      label('');
      separator();
      label('');

      label('Test Image (SVG) - Original mode:');
      label('');

      // Display test image in original mode
      image('/assets/test-image.svg', 'original');

      label('');
      separator();
      label('');

      label('How it works:');
      label('1. Page executes once in discovery context');
      label('2. All image() calls are recorded');
      label('3. Browser fetches images via HTTP');
      label('4. Page executes again with local cached images');
      label('5. Fyne displays the cached images');
      label('');

      label('Supported formats: PNG, JPEG, GIF, BMP, SVG');
      label('');
    });
  });

  separator();
  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
