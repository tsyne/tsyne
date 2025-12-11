/**
 * Reactive Form Integration Tests
 *
 * GUI tests for the reactive form demo.
 * For data binding unit tests, see reactive-form.logic.test.ts
 *
 * Usage:
 *   npm test examples/reactive-form.test.ts
 *   TSYNE_HEADED=1 npm test examples/reactive-form.test.ts  # Visual debugging
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { createReactiveFormApp } from './reactive-form';

describe('Reactive Form Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display form with all fields', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createReactiveFormApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check form labels are visible
    await ctx.expect(ctx.getByText('First Name:')).toBeVisible();
    await ctx.expect(ctx.getByText('Last Name:')).toBeVisible();
    await ctx.expect(ctx.getByText('Email:')).toBeVisible();
    await ctx.expect(ctx.getByText('Age:')).toBeVisible();
  });

  test('should update full name when first and last name change', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createReactiveFormApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Fill sample data using the button
    await ctx.getByExactText('Fill Sample Data').click();

    // Check that the form summary shows the data
    await ctx.getByText('John Doe').within(1000).shouldExist();
  });

  test('should clear form when Clear button clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createReactiveFormApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Fill sample data first
    await ctx.getByExactText('Fill Sample Data').click();
    await ctx.getByText('John Doe').within(200).shouldExist();

    // Then clear
    await ctx.getByExactText('Clear Form').click();

    // Check that name label is reset
    await ctx.getByText('Enter your name').within(1000).shouldExist();
  });
});
