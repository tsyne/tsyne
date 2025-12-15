import { TsyneTest, TestContext } from '../index-test';
import { App } from '../app';

const createTestApp = (app: App, onSubmit: (text: string) => void, onDoubleClick: () => void) => {
  app.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.entry('placeholder', onSubmit, 0, onDoubleClick);
      });
    });
    win.show();
  });
};

describe('Entry', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let onSubmit: jest.Mock;
  let onDoubleClick: jest.Mock;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    onSubmit = jest.fn();
    onDoubleClick = jest.fn();
    const testApp = await tsyneTest.createApp((app) => createTestApp(app, onSubmit, onDoubleClick));
    ctx = tsyneTest.getContext();
    await testApp.run();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('should call onSubmit with the entry text', async () => {
    const entry = ctx.getByType('entry');
    await entry.type('hello');
    await entry.submit();
    expect(onSubmit).toHaveBeenCalledWith('hello');
  });

  it('should call onDoubleClick when the entry is double-tapped', async () => {
    const entry = ctx.getByType('entry');
    await entry.doubleClick();
    expect(onDoubleClick).toHaveBeenCalled();
  });
});
