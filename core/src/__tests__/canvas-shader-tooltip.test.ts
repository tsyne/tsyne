import { TsyneTest, TestContext } from '../index-test';
import { App, CanvasShader } from '../index';
import { Context } from '../context';
import { BridgeInterface } from '../fynebridge';

const SIMPLE_SHADER = `
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    gl_FragColor = vec4(uv.x, uv.y, 0.5, 1.0);
  }
`;

// ============================================================================
// Unit Tests — mock bridge, verify message payloads
// ============================================================================

describe('CanvasShader Tooltip (unit)', () => {
  let ctx: Context;
  let mockBridge: Partial<BridgeInterface>;
  let sentMessages: Array<{ action: string; payload: any }>;

  beforeEach(() => {
    sentMessages = [];
    mockBridge = {
      send: jest.fn((action: string, payload: any) => {
        sentMessages.push({ action, payload });
        return Promise.resolve();
      }),
      registerEventHandler: jest.fn(),
    };
    ctx = new Context(mockBridge as BridgeInterface);
  });

  test('showTooltip sends correct message with text, x, y', async () => {
    const shader = new CanvasShader(ctx, 400, 300, SIMPLE_SHADER);

    await shader.showTooltip('Hello Paris', 120, 80);

    const msg = sentMessages.find(m => m.action === 'showTooltip');
    expect(msg).toBeDefined();
    expect(msg!.payload).toEqual({
      widgetId: shader.id,
      text: 'Hello Paris',
      x: 120,
      y: 80,
    });
  });

  test('hideTooltip sends correct message with widgetId only', async () => {
    const shader = new CanvasShader(ctx, 400, 300, SIMPLE_SHADER);

    await shader.hideTooltip();

    const msg = sentMessages.find(m => m.action === 'hideTooltip');
    expect(msg).toBeDefined();
    expect(msg!.payload).toEqual({ widgetId: shader.id });
  });

  test('showTooltip then hideTooltip sends both messages in order', async () => {
    const shader = new CanvasShader(ctx, 400, 300, SIMPLE_SHADER);

    await shader.showTooltip('Montmartre (tourism) 87%', 200, 150);
    await shader.hideTooltip();

    const tooltipMsgs = sentMessages.filter(m =>
      m.action === 'showTooltip' || m.action === 'hideTooltip'
    );
    expect(tooltipMsgs).toHaveLength(2);
    expect(tooltipMsgs[0].action).toBe('showTooltip');
    expect(tooltipMsgs[1].action).toBe('hideTooltip');
  });

  test('multiple showTooltip calls each send a message', async () => {
    const shader = new CanvasShader(ctx, 400, 300, SIMPLE_SHADER);

    await shader.showTooltip('A', 10, 20);
    await shader.showTooltip('B', 30, 40);

    const shows = sentMessages.filter(m => m.action === 'showTooltip');
    expect(shows).toHaveLength(2);
    expect(shows[0].payload.text).toBe('A');
    expect(shows[1].payload.text).toBe('B');
  });
});

// ============================================================================
// Integration Tests — real bridge round-trip
// ============================================================================

describe('CanvasShader Tooltip (integration)', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('should send showTooltip bridge message with correct params', async () => {
    let shaderRef: CanvasShader;

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Shader tooltip', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          shaderRef = app.canvasShader(400, 300, SIMPLE_SHADER, {
            onMouseMoved: () => {},
          });
          shaderRef.withId('shader');
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // showTooltip should not throw
    await shaderRef!.showTooltip('Test Tooltip', 100, 150);
    await ctx.wait(50);

    // hideTooltip should not throw
    await shaderRef!.hideTooltip();
    await ctx.wait(50);
  });

  it('should handle double hideTooltip without error', async () => {
    let shaderRef: CanvasShader;

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Shader hide tooltip', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          shaderRef = app.canvasShader(400, 300, SIMPLE_SHADER, {
            onMouseMoved: () => {},
          });
          shaderRef.withId('shader');
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await shaderRef!.showTooltip('Hover Info', 50, 75);
    await ctx.wait(50);
    await shaderRef!.hideTooltip();
    await ctx.wait(50);

    // Double hide should not throw
    await shaderRef!.hideTooltip();
    await ctx.wait(50);
  });
});
