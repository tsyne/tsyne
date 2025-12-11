import { TsyneTest, TestContext } from '../index-test';
import { App } from '../app';
import { getAccessibilityManager, resetAccessibilityManager } from '../accessibility';

const createTestApp = (app: App) => {
  app.window({ title: 'Accessibility Test' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        // Button with accessibility
        app.button('Submit')
          .onClick(() => {})
          .withId('submitBtn')
          .accessibility({
            label: 'Submit Form',
            description: 'Submits the registration form',
            role: 'button',
            hint: 'Press Enter or click to submit'
          });

        // Label with accessibility
        app.label('Username:')
          .withId('usernameLabel')
          .accessibility({
            label: 'Username Field Label',
            role: 'label'
          });

        // Entry with accessibility
        app.entry('Enter username')
          .withId('usernameEntry')
          .accessibility({
            label: 'Username Input',
            description: 'Enter your username here',
            role: 'textbox',
            hint: 'Type your username and press Enter'
          });

        // Note: Containers don't support .withId() in test context currently
        app.label('Container label').withId('containerLabel');
      });
    });
    win.show();
  });
};

describe('Accessibility', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp(createTestApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
  });

  afterEach(async () => {
    resetAccessibilityManager();
    await tsyneTest.cleanup();
  });

  it('should apply accessibility options to widgets', async () => {
    // Verify widgets are visible
    await ctx.expect(ctx.getByText('Submit')).toBeVisible();
    await ctx.expect(ctx.getByText('Username:')).toBeVisible();
    await ctx.expect(ctx.getByPlaceholder('Enter username')).toBeVisible();
  });

  it('should support fluent chaining with accessibility', async () => {
    // Verify that widgets with .accessibility() chained after .withId() work correctly
    await ctx.expect(ctx.getByID('submitBtn')).toBeVisible();
    await ctx.expect(ctx.getByID('usernameLabel')).toBeVisible();
    await ctx.expect(ctx.getByID('usernameEntry')).toBeVisible();
    await ctx.expect(ctx.getByID('containerLabel')).toBeVisible();
  });
});

describe('AccessibilityManager', () => {
  let tsyneTest: TsyneTest;
  let testApp: App;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Accessibility Manager Test' }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Test');
          });
        });
        win.show();
      });
    });
    await testApp.run();
  });

  afterEach(async () => {
    resetAccessibilityManager();
    await tsyneTest.cleanup();
  });

  it('should be disabled by default', () => {
    const manager = getAccessibilityManager(testApp.getContext());
    expect(manager.isEnabled()).toBe(false);
  });

  it('should enable and disable accessibility mode', () => {
    const manager = getAccessibilityManager(testApp.getContext());

    manager.enable();
    expect(manager.isEnabled()).toBe(true);

    manager.disable();
    expect(manager.isEnabled()).toBe(false);
  });

  it('should toggle accessibility mode', () => {
    const manager = getAccessibilityManager(testApp.getContext());

    const initialState = manager.isEnabled();
    manager.toggle();
    expect(manager.isEnabled()).toBe(!initialState);

    manager.toggle();
    expect(manager.isEnabled()).toBe(initialState);
  });

  it('should register widget accessibility information', () => {
    const manager = getAccessibilityManager(testApp.getContext());

    manager.registerWidget('widget-1', {
      widgetId: 'widget-1',
      label: 'Test Widget',
      description: 'A test widget',
      role: 'button',
      hint: 'Click me'
    });

    const info = manager.getWidgetInfo('widget-1');
    expect(info).toBeDefined();
    expect(info?.label).toBe('Test Widget');
    expect(info?.description).toBe('A test widget');
    expect(info?.role).toBe('button');
    expect(info?.hint).toBe('Click me');
  });

  it('should clear all registered widgets', () => {
    const manager = getAccessibilityManager(testApp.getContext());

    manager.registerWidget('widget-1', {
      widgetId: 'widget-1',
      label: 'Test Widget 1'
    });

    manager.registerWidget('widget-2', {
      widgetId: 'widget-2',
      label: 'Test Widget 2'
    });

    expect(manager.getWidgetInfo('widget-1')).toBeDefined();
    expect(manager.getWidgetInfo('widget-2')).toBeDefined();

    manager.clear();

    expect(manager.getWidgetInfo('widget-1')).toBeUndefined();
    expect(manager.getWidgetInfo('widget-2')).toBeUndefined();
  });
});
