/**
 * Test: canvasShader with labels
 * Verifies that labels render correctly alongside canvasShader.
 * (Previously broken - fixed by re-enabling vertex attrib arrays after shader draw)
 */
import { TsyneTest, TestContext } from '../src/index-test';
import * as fs from 'fs';
import * as path from 'path';

const simpleShader = `
#version 110
uniform vec2 u_resolution;
void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    gl_FragColor = vec4(uv.x, uv.y, 0.5, 1.0);
}
`;

// Screenshot directory
const screenshotDir = path.join(__dirname, 'screenshots');

describe('canvasShader with labels', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeAll(() => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('labels render with canvasShader', async () => {
    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Labels + Shader', width: 500, height: 400 }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Label before shader');

            a.canvasStack(() => {
              a.canvasShader(400, 250, simpleShader, {});
            });

            a.label('Label after shader');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'labels-with-shader.png'));
  }, 20000);

  it('labels render with rectangle (control)', async () => {
    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Labels + Rectangle', width: 500, height: 400 }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Label before rectangle');

            a.canvasStack(() => {
              a.canvasRectangle({ width: 400, height: 250, fillColor: '#336699' });
            });

            a.label('Label after rectangle');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(screenshotDir, 'labels-with-rectangle.png'));
  }, 20000);

});
