// Test for DateEntry widget and event-form demo

import { TsyneTest, TestContext } from '../src/index-test';
import { App } from '../src';

function createEventForm(a: App) {
  let eventNameEntry: any;
  let eventDateEntry: any;
  let eventEndDateEntry: any;
  let statusLabel: any;

  a.window({ title: 'Create Event', width: 450, height: 400 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Create New Event', undefined, 'center', undefined, { bold: true });
        a.separator();

        // Event Name
        a.label('Event Name:');
        eventNameEntry = a.entry('Enter event name');

        // Event Date
        a.label('Start Date:');
        eventDateEntry = a.dateentry(undefined, (date: string) => {
          statusLabel.setText(`Start date: ${date}`);
        });

        // End Date
        a.label('End Date:');
        eventEndDateEntry = a.dateentry(undefined, (date: string) => {
          statusLabel.setText(`End date: ${date}`);
        });

        a.separator();

        // Status label
        statusLabel = a.label('Status: Ready');

        // Buttons
        a.hbox(() => {
          a.button('Set Today', async () => {
            const today = new Date().toISOString().split('T')[0];
            await eventDateEntry.setDate(today);
            await eventEndDateEntry.setDate(today);
            statusLabel.setText(`Dates set to: ${today}`);
          });

          a.button('Get Dates', async () => {
            const startDate = await eventDateEntry.getDate();
            const endDate = await eventEndDateEntry.getDate();
            statusLabel.setText(`Start: ${startDate || 'not set'}, End: ${endDate || 'not set'}`);
          });

          a.button('Clear', async () => {
            await eventDateEntry.setDate('');
            await eventEndDateEntry.setDate('');
            statusLabel.setText('Dates cleared');
          });
        });
      });
    });
    win.show();
  });
}

describe('DateEntry Widget', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  test('should create DateEntry widget', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createEventForm(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify the form elements are present
    await ctx.expect(ctx.getByText('Create New Event')).toBeVisible();
    await ctx.expect(ctx.getByText('Start Date:')).toBeVisible();
    await ctx.expect(ctx.getByText('End Date:')).toBeVisible();
    await ctx.expect(ctx.getByText('Set Today')).toBeVisible();
  });

  test('should set and get date via buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createEventForm(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click Set Today
    await ctx.getByText('Set Today').click();

    // Wait and check status
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Check that the status shows the date was set
    await ctx.expect(ctx.getByText(`Dates set to: ${today}`)).toBeVisible();
  });

  test('should clear dates', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createEventForm(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Set dates first
    await ctx.getByText('Set Today').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Clear dates
    await ctx.getByText('Clear').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that status shows dates cleared
    await ctx.expect(ctx.getByText('Dates cleared')).toBeVisible();
  });

  test('should get empty dates initially', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createEventForm(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click Get Dates without setting any
    await ctx.getByText('Get Dates').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that status shows dates are not set
    await ctx.expect(ctx.getByText('Start: not set, End: not set')).toBeVisible();
  });
});
