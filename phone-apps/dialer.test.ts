/**
 * TsyneTest UI tests for Dialer app
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { createDialerApp } from './dialer';
import { MockTelephonyService, MockContactsService } from './services';

describe('Dialer App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let telephony: MockTelephonyService;
  let contacts: MockContactsService;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    telephony = new MockTelephonyService();
    contacts = new MockContactsService();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display empty input initially', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, telephony, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('dialer-display').within(500).shouldBe('Enter number');
  });

  test('should enter digits when keypad pressed', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, telephony, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Press some digits
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-5').click();

    await ctx.getByID('dialer-display').within(500).shouldBe('555');
  });

  test('should clear display when Clear pressed', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, telephony, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter some digits
    await ctx.getByID('key-1').click();
    await ctx.getByID('key-2').click();
    await ctx.getByID('key-3').click();

    await ctx.getByID('dialer-display').within(500).shouldBe('123');

    // Clear
    await ctx.getByID('btn-clear').click();

    await ctx.getByID('dialer-display').within(500).shouldBe('Enter number');
  });

  test('should delete last digit when Del pressed', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, telephony, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter digits
    await ctx.getByID('key-1').click();
    await ctx.getByID('key-2').click();
    await ctx.getByID('key-3').click();

    await ctx.getByID('dialer-display').within(500).shouldBe('123');

    // Delete last digit
    await ctx.getByID('btn-del').click();

    await ctx.getByID('dialer-display').within(500).shouldBe('12');
  });

  test('should enter star and hash', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, telephony, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('key-star').click();
    await ctx.getByID('key-6').click();
    await ctx.getByID('key-7').click();
    await ctx.getByID('key-hash').click();

    await ctx.getByID('dialer-display').within(500).shouldBe('*67#');
  });

  test('should show recent calls', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, telephony, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Recent calls should be visible (sample data from MockTelephonyService)
    await ctx.getByID('call-0-name').within(500).shouldExist();
  });

  test('should update status when Call pressed', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, telephony, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter a number
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-1').click();
    await ctx.getByID('key-2').click();
    await ctx.getByID('key-3').click();
    await ctx.getByID('key-4').click();

    // Press call
    await ctx.getByID('btn-call').click();

    // Status should show calling
    await ctx.getByID('dialer-status').within(500).shouldExist();
  });
});
