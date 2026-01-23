#!/usr/bin/env npx tsx
/**
 * Earth Globe Demo
 *
 * Renders planet Earth using canvasSphere with NASA Blue Marble texture
 * Texture source: Solar System Scope (CC BY 4.0)
 * Based on NASA Blue Marble imagery
 */

import { app } from 'tsyne';
import { resolveTransport } from 'tsyne';
import * as fs from 'fs';
import * as path from 'path';

const TEXTURE_URL = 'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg';

async function ensureTexture(texturePath: string): Promise<Buffer> {
  if (fs.existsSync(texturePath)) {
    return fs.readFileSync(texturePath);
  }

  console.log('Downloading Earth texture from Solar System Scope...');
  const response = await fetch(TEXTURE_URL);
  if (!response.ok) {
    throw new Error(`Failed to download texture: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Ensure resources directory exists
  const dir = path.dirname(texturePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(texturePath, buffer);
  console.log(`Saved texture to ${texturePath}`);
  return buffer;
}

app(resolveTransport(), { title: 'Earth Globe' }, async (a) => {
  // Load Earth texture (download if not present)
  const texturePath = path.join(__dirname, './earth_daymap.jpg');
  const textureData = await ensureTexture(texturePath);
  const textureBase64 = `data:image/jpeg;base64,${textureData.toString('base64')}`;
  await a.resources.registerResource('earth-texture', textureBase64);

  let rotation = 0;

  a.window({ title: 'Planet Earth', width: 450, height: 500 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Planet Earth');
        a.label('NASA Blue Marble via Solar System Scope (CC BY 4.0)');
        a.spacer(5);

        const globe = a.canvasSphere({
          cx: 150,
          cy: 150,
          radius: 140,
          pattern: 'solid',
          solidColor: '#1E90FF',
          texture: {
            resourceName: 'earth-texture',
            mapping: 'equirectangular',
          },
          lighting: {
            direction: { x: 1, y: -0.2, z: 0.8 },
            ambient: 0.25,
            diffuse: 0.75,
          },
          rotationY: rotation,
        });

        a.spacer(150);

        // Rotation controls
        a.hbox(() => {
          a.button('Rotate Left').onClick(() => {
            rotation -= 0.3;
            globe.update({ rotationY: rotation });
          });
          a.spacer(10);
          a.button('Rotate Right').onClick(() => {
            rotation += 0.3;
            globe.update({ rotationY: rotation });
          });
          a.spacer(10);
          a.button('Auto Spin').onClick(() => {
            setInterval(() => {
              rotation += 0.02;
              globe.update({ rotationY: rotation });
            }, 50);
          });
        });
      });
    });

    win.show();
  });
});
