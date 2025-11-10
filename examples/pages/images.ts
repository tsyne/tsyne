// Images Demo Page - Demonstrates image display
// URL: http://localhost:3000/images
// Feature: Display images (like HTML <img> tags)

const { vbox, scroll, label, button, separator, image } = tsyne;

vbox(() => {
  label('Images Demo');
  label('This page demonstrates image display, similar to HTML <img> tags');
  separator();

  scroll(() => {
    vbox(() => {
      label('');
      label('Image display modes:');
      label('');

      // Note: These images would need to exist in the filesystem
      // For demonstration, we show what the API looks like
      label('1. Contain mode (default) - fits image inside bounds:');
      label('   image(\'/path/to/image.png\', \'contain\')');
      label('');

      label('2. Stretch mode - stretches to fill bounds:');
      label('   image(\'/path/to/image.png\', \'stretch\')');
      label('');

      label('3. Original mode - displays at original size:');
      label('   image(\'/path/to/image.png\', \'original\')');
      label('');

      separator();
      label('');
      label('Image formats supported:');
      label('  • PNG (.png)');
      label('  • JPEG (.jpg, .jpeg)');
      label('  • GIF (.gif)');
      label('  • BMP (.bmp)');
      label('  • SVG (.svg)');
      label('');

      separator();
      label('');
      label('Example usage in Tsyne pages:');
      label('');
      label('const { image } = tsyne;');
      label('image(\'/assets/logo.png\', \'contain\');');
      label('');

      label('This is equivalent to HTML:');
      label('<img src="/assets/logo.png" style="object-fit: contain">');
      label('');
    });
  });

  separator();
  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
