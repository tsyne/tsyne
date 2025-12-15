import { TsyneTest, TestContext } from '../index-test';
import { App } from '../app';

const createTestApp = (app: App, onDrag: (x: number, y: number) => void, onDragEnd: (x: number, y: number) => void) => {
  app.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.image('test.png', 'original', () => {}, onDrag, onDragEnd);
      });
    });
    win.show();
  });
};

describe('Image', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let onDrag: jest.Mock;
  let onDragEnd: jest.Mock;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    onDrag = jest.fn();
    onDragEnd = jest.fn();
    const testApp = await tsyneTest.createApp((app) => createTestApp(app, onDrag, onDragEnd));
    ctx = tsyneTest.getContext();
    await testApp.run();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('should call onDrag and onDragEnd when the image is dragged', async () => {
    const image = ctx.getByType('image');
    await image.drag(10, 20);
    expect(onDrag).toHaveBeenCalledWith(10, 20);
    expect(onDragEnd).toHaveBeenCalledWith(0, 0);
  });
});
