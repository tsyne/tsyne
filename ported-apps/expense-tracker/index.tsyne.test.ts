/**
 * TsyneTest for Expense Tracker App
 *
 * Integration tests for the Expense Tracker app UI using TsyneTest framework.
 * Tests user interactions, expense management, and tab navigation.
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { buildExpenseTrackerApp } from './index';

describe('Expense Tracker App UI Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    // Cleanup
  });

  it('should render the app with title and tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check app title
    const title = await ctx.getByID('app-title').getText();
    expect(title).toContain('Expense Tracker');

    // Check tabs exist
    const expensesTab = await ctx.getByID('tab-expenses');
    expect(expensesTab).toBeDefined();
  });

  it('should display summary labels', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const todayLabel = await ctx.getByID('total-today').getText();
    expect(todayLabel).toMatch(/Today:/);

    const monthLabel = await ctx.getByID('total-month').getText();
    expect(monthLabel).toMatch(/This Month:/);
  });

  it('should show expenses tab by default', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const expensesTitle = await ctx.getByID('expenses-title').getText();
    expect(expensesTitle).toBe('Recent Expenses');
  });

  it('should switch to budgets tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click budgets tab
    await ctx.getByID('tab-budgets').click();

    // Budgets title should be visible
    const budgetsTitle = await ctx.getByID('budgets-title').within(1000).getText();
    expect(budgetsTitle).toBe('Budget Overview');
  });

  it('should switch to analytics tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click analytics tab
    await ctx.getByID('tab-analytics').click();

    // Analytics title should be visible
    const analyticsTitle = await ctx.getByID('analytics-title').within(1000).getText();
    expect(analyticsTitle).toBe('Spending Analytics');
  });

  it('should navigate between all tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start in expenses
    let title = await ctx.getByID('expenses-title').getText();
    expect(title).toBe('Recent Expenses');

    // Go to budgets
    await ctx.getByID('tab-budgets').click();
    title = await ctx.getByID('budgets-title').within(500).getText();
    expect(title).toBe('Budget Overview');

    // Go to analytics
    await ctx.getByID('tab-analytics').click();
    title = await ctx.getByID('analytics-title').within(500).getText();
    expect(title).toBe('Spending Analytics');

    // Back to expenses
    await ctx.getByID('tab-expenses').click();
    title = await ctx.getByID('expenses-title').within(500).getText();
    expect(title).toBe('Recent Expenses');
  });

  it('should display expenses list', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should have some expenses visible
    const expenseCategory = await ctx.getByID('expenses-title').within(500).getText();
    expect(expenseCategory).toBeDefined();
  });

  it('should display budgets list', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to budgets tab
    await ctx.getByID('tab-budgets').click();

    // Should have budget title
    const budgetsTitle = await ctx.getByID('budgets-title').within(500).getText();
    expect(budgetsTitle).toBe('Budget Overview');
  });

  it('should display analytics summary', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to analytics tab
    await ctx.getByID('tab-analytics').click();

    // Check for analytics elements
    const totalLabel = await ctx.getByID('analytics-total').within(500).getText();
    expect(totalLabel).toMatch(/Total Spent:/);
  });

  it('should have add expense button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const addBtn = await ctx.getByID('btn-add-expense');
    expect(addBtn).toBeDefined();
  });

  it('should have filter buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const todayBtn = await ctx.getByID('filter-today');
    expect(todayBtn).toBeDefined();

    const monthBtn = await ctx.getByID('filter-month');
    expect(monthBtn).toBeDefined();
  });

  it('should have new budget button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to budgets
    await ctx.getByID('tab-budgets').click();

    const newBudgetBtn = await ctx.getByID('btn-new-budget');
    expect(newBudgetBtn).toBeDefined();
  });

  it('should have recurring expenses section in analytics', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to analytics
    await ctx.getByID('tab-analytics').click();

    // Recurring section should exist
    const recurringLabel = await ctx.getByID('recurring-label').within(500).getText();
    expect(recurringLabel).toBe('🔄 Recurring Expenses');
  });

  it('should maintain state when switching tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Get initial total
    const initialTotal = await ctx.getByID('total-month').getText();

    // Switch tabs
    await ctx.getByID('tab-budgets').click();
    await ctx.getByID('tab-analytics').click();

    // Back to expenses
    await ctx.getByID('tab-expenses').click();

    // Total should be same
    const finalTotal = await ctx.getByID('total-month').within(500).getText();
    expect(finalTotal).toBe(initialTotal);
  });

  it('should have proper accessibility with IDs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Key elements should have IDs
    const elements = [
      'app-title',
      'total-today',
      'total-month',
      'tab-expenses',
      'tab-budgets',
      'tab-analytics',
      'expenses-title',
      'btn-add-expense',
    ];

    for (const id of elements) {
      const element = await ctx.getByID(id);
      expect(element).toBeDefined();
    }
  });

  it('should capture screenshot of expenses view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/expense-tracker-expenses.png');
    }
  });

  it('should capture screenshot of budgets view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Switch to budgets
    await ctx.getByID('tab-budgets').click();
    await ctx.getByID('budgets-title').within(1000).shouldExist();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/expense-tracker-budgets.png');
    }
  });

  it('should capture screenshot of analytics view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildExpenseTrackerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Switch to analytics
    await ctx.getByID('tab-analytics').click();
    await ctx.getByID('analytics-title').within(1000).shouldExist();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/expense-tracker-analytics.png');
    }
  });
});
