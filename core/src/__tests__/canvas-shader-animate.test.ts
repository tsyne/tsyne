import { TsyneTest, TestContext } from '../index-test';
import { App, CanvasShader } from '../index';
import { Context } from '../context';
import { BridgeInterface } from '../fynebridge';

const SIMPLE_SHADER = `
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    gl_FragColor = vec4(uv.x, uv.y, sin(u_time) * 0.5 + 0.5, 1.0);
  }
`;

// ============================================================================
// Unit Tests — mock bridge, verify message payloads
// ============================================================================

describe('CanvasShader Auto-Animate (unit)', () => {
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

  test('setAutoAnimate(true) sends enabled=true', async () => {
    const shader = new CanvasShader(ctx, 400, 300, SIMPLE_SHADER);

    await shader.setAutoAnimate(true);

    const msg = sentMessages.find(m => m.action === 'setShaderAutoAnimate');
    expect(msg).toBeDefined();
    expect(msg!.payload).toEqual({
      widgetId: shader.id,
      enabled: true,
    });
  });

  test('setAutoAnimate(false) sends enabled=false', async () => {
    const shader = new CanvasShader(ctx, 400, 300, SIMPLE_SHADER);

    await shader.setAutoAnimate(false);

    const msg = sentMessages.find(m => m.action === 'setShaderAutoAnimate');
    expect(msg).toBeDefined();
    expect(msg!.payload.enabled).toBe(false);
  });

  test('enable then disable sends two messages in order', async () => {
    const shader = new CanvasShader(ctx, 400, 300, SIMPLE_SHADER);

    await shader.setAutoAnimate(true);
    await shader.setAutoAnimate(false);

    const animMsgs = sentMessages.filter(m => m.action === 'setShaderAutoAnimate');
    expect(animMsgs).toHaveLength(2);
    expect(animMsgs[0].payload.enabled).toBe(true);
    expect(animMsgs[1].payload.enabled).toBe(false);
  });

  test('message payload includes widgetId', async () => {
    const shader = new CanvasShader(ctx, 400, 300, SIMPLE_SHADER);
    const id = shader.id;

    await shader.setAutoAnimate(true);

    const msg = sentMessages.find(m => m.action === 'setShaderAutoAnimate');
    expect(msg!.payload.widgetId).toBe(id);
  });
});

// ============================================================================
// Integration Tests — real bridge round-trip
// ============================================================================

describe('CanvasShader Auto-Animate (integration)', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('should enable and disable auto-animate without error', async () => {
    let shaderRef: CanvasShader;

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Shader animate', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          shaderRef = app.canvasShader(400, 300, SIMPLE_SHADER);
          shaderRef.withId('shader');
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enable auto-animate
    await shaderRef!.setAutoAnimate(true);
    await ctx.wait(100);

    // Disable auto-animate
    await shaderRef!.setAutoAnimate(false);
    await ctx.wait(50);
  });

  it('should be idempotent — double enable and double disable do not crash', async () => {
    let shaderRef: CanvasShader;

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Shader animate idempotent', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          shaderRef = app.canvasShader(400, 300, SIMPLE_SHADER);
          shaderRef.withId('shader');
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Double enable
    await shaderRef!.setAutoAnimate(true);
    await shaderRef!.setAutoAnimate(true);
    await ctx.wait(50);

    // Double disable
    await shaderRef!.setAutoAnimate(false);
    await shaderRef!.setAutoAnimate(false);
    await ctx.wait(50);
  });

  it('should work with enable→disable→enable cycle', async () => {
    let shaderRef: CanvasShader;

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Shader animate cycle', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          shaderRef = app.canvasShader(400, 300, SIMPLE_SHADER);
          shaderRef.withId('shader');
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await shaderRef!.setAutoAnimate(true);
    await ctx.wait(50);
    await shaderRef!.setAutoAnimate(false);
    await ctx.wait(50);
    await shaderRef!.setAutoAnimate(true);
    await ctx.wait(100);
    await shaderRef!.setAutoAnimate(false);
    await ctx.wait(50);
  });
});
