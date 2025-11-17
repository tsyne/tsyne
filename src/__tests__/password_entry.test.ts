import { TsyneTest, TestContext } from '../index-test';
import { App } from '../app';

const createTestApp = (app: App, onSubmit: (text: string) => void) => {
  app.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.passwordentry('password', onSubmit);
      });
    });
    win.show();
  });
};

describe('PasswordEntry', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let onSubmit: jest.Mock;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    onSubmit = jest.fn();
    const testApp = await tsyneTest.createApp((app) => createTestApp(app, onSubmit));
    ctx = tsyneTest.getContext();
    await testApp.run();
  });

  afterEach(() => {
    tsyneTest.cleanup();
  });

  it('should call onSubmit with the entry text', async () => {
    const entry = ctx.getByType('passwordentry');
    await entry.type('hello');
    await entry.submit();
    expect(onSubmit).toHaveBeenCalledWith('hello');
  });
});
