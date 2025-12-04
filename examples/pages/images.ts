// Images Demo Page - Demonstrates image display
// URL: http://localhost:3000/images
// Feature: Display images (like HTML <img> tags)

import * as fs from 'fs';
import * as path from 'path';
import { Resvg } from '@resvg/resvg-js';

const { vbox, scroll, label, button, separator, image } = tsyne;

function renderSVGToBase64(svgPath: string, width?: number, height?: number): string {
  const svgBuffer = fs.readFileSync(svgPath);
  const opts: any = {
    fitTo: {
      mode: 'width',
      value: width || 200,
    },
  };
  const resvg = new Resvg(svgBuffer, opts);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  const base64 = pngBuffer.toString('base64');
  return `data:image/png;base64,${base64}`;
}

vbox(() => {
  label('Images Demo');
  label('This page demonstrates HTTP image loading with dual-execution discovery');
  separator();

  const imagePath = path.join(__dirname, '../assets/test-image.svg');
  const imageBase64 = renderSVGToBase64(imagePath);

  scroll(() => {
    vbox(() => {
      label('');
      label('Test Image (SVG) - Contain mode:');
      label('');

      // Display test image in contain mode
      image(imageBase64, 'contain');

      label('');
      separator();
      label('');

      label('Test Image (SVG) - Stretch mode:');
      label('');

      // Display test image in stretch mode
      image(imageBase64, 'stretch');

      label('');
      separator();
      label('');

      label('Test Image (SVG) - Original mode:');
      label('');

      // Display test image in original mode
      image(imageBase64, 'original');

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
  button('Back to Home').onClick(() => {
    browserContext.changePage('/');
  });
});
