import { TsyneTest, TestContext } from '../index-test';
import { App, CanvasShader } from '../index';

const SIMPLE_SHADER = `
  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    gl_FragColor = vec4(uv.x, uv.y, 0.5, 1.0);
  }
`;

describe('CanvasShader Events', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('should fire onMouseMoved from constructor options', async () => {
    const events: any[] = [];

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Shader mouseMoved', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.canvasShader(400, 300, SIMPLE_SHADER, {
            onMouseMoved: (e) => { events.push(e); },
          }).withId('shader');
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('shader').simulate('mouseMoved', { x: 50, y: 60 });
    await ctx.wait(50);

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].position.x).toBe(50);
    expect(events[0].position.y).toBe(60);
  });

  it('should fire onScroll from constructor options', async () => {
    const events: any[] = [];

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Shader scroll', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.canvasShader(400, 300, SIMPLE_SHADER, {
            onScroll: (e) => { events.push(e); },
          }).withId('shader');
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('shader').simulate('scrolled', { dx: 0, dy: 10, x: 100, y: 100 });
    await ctx.wait(50);

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].scrolled.dy).toBe(10);
  });

  it('should fire onDrag and onDragEnd from constructor options', async () => {
    const dragEvents: any[] = [];
    let dragEnded = false;

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Shader drag', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.canvasShader(400, 300, SIMPLE_SHADER, {
            onDrag: (e) => { dragEvents.push(e); },
            onDragEnd: () => { dragEnded = true; },
          }).withId('shader');
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('shader').simulate('dragged', { x: 100, y: 100, dx: 5, dy: 3 });
    await ctx.wait(50);
    await ctx.getById('shader').simulate('dragEnd');
    await ctx.wait(50);

    expect(dragEvents.length).toBeGreaterThanOrEqual(1);
    expect(dragEvents[0].dragged.dx).toBe(5);
    expect(dragEnded).toBe(true);
  });

  it('should fire onMouseDown and onMouseUp from constructor options', async () => {
    const log: string[] = [];

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Shader mouse buttons', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.canvasShader(400, 300, SIMPLE_SHADER, {
            onMouseDown: (e) => { log.push(`down:${e.button}`); },
            onMouseUp: (e) => { log.push(`up:${e.button}`); },
          }).withId('shader');
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('shader').simulate('mouseDown', { button: 1, x: 10, y: 10 });
    await ctx.wait(50);
    await ctx.getById('shader').simulate('mouseUp', { button: 1, x: 10, y: 10 });
    await ctx.wait(50);

    expect(log).toEqual(['down:1', 'up:1']);
  });

  it('should support post-construction event registration via .onMouseMoved()', async () => {
    const events: any[] = [];

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Shader post-reg', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          const shader = app.canvasShader(400, 300, SIMPLE_SHADER);
          shader.withId('shader');
          shader.onMouseMoved((e) => { events.push(e); });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('shader').simulate('mouseMoved', { x: 25, y: 35 });
    await ctx.wait(50);

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].position.x).toBe(25);
  });

  it('should update width and height after resize()', async () => {
    let shader: CanvasShader;

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Shader resize', width: 800, height: 600 }, (win) => {
        win.setContent(() => {
          shader = app.canvasShader(400, 300, SIMPLE_SHADER);
          shader.withId('shader');
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    expect(shader!.width).toBe(400);
    expect(shader!.height).toBe(300);

    await shader!.resize(800, 600);

    expect(shader!.width).toBe(800);
    expect(shader!.height).toBe(600);
  });
});
