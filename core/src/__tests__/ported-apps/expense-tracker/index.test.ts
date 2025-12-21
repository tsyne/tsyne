/**
 * Jest Tests for Expense Tracker Store
 *
 * Tests for the ExpenseStore model, including expense management,
 * budgets, analytics, and observable pattern.
 */

import { ExpenseStore, Expense, Budget } from '../../../../../ported-apps/expense-tracker/index';

describe('ExpenseStore', () => {
  let store: ExpenseStore;

  beforeEach(() => {
    store = new ExpenseStore();
  });

  describe('Expenses', () => {
    it('should return all expenses sorted by date (newest first)', () => {
      const expenses = store.getExpenses();
      expect(expenses.length).toBeGreaterThan(0);
      // Check sorting
      for (let i = 0; i < expenses.length - 1; i++) {
        expect(expenses[i].date.getTime()).toBeGreaterThanOrEqual(
          expenses[i + 1].date.getTime()
        );
      }
    });

    it('should add a new expense', () => {
      const initialCount = store.getExpenses().length;
      store.addExpense(50.0, 'Groceries', 'Weekly shopping', false);
      expect(store.getExpenses()).toHaveLength(initialCount + 1);
    });

    it('should add recurring expense with interval', () => {
      const expense = store.addExpense(10.0, 'Coffee', 'Daily coffee', true, 'daily');
      expect(expense.isRecurring).toBe(true);
      expect(expense.recurringInterval).toBe('daily');
    });

    it('should delete an expense', () => {
      const expenses = store.getExpenses();
      const firstExpense = expenses[0];
      const initialCount = store.getExpenses().length;

      store.deleteExpense(firstExpense.id);

      expect(store.getExpenses()).toHaveLength(initialCount - 1);
      expect(store.getExpenses().find((e) => e.id === firstExpense.id)).toBeUndefined();
    });

    it('should filter expenses by category', () => {
      const groceryExpenses = store.getExpensesByCategory('Groceries');
      expect(groceryExpenses.every((e) => e.category === 'Groceries')).toBe(true);
    });

    it('should get expenses today', () => {
      const todayExpenses = store.getExpensesToday();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const expense of todayExpenses) {
        const eDate = new Date(expense.date);
        eDate.setHours(0, 0, 0, 0);
        expect(eDate.getTime()).toBe(today.getTime());
      }
    });

    it('should get expenses this month', () => {
      const monthExpenses = store.getExpensesThisMonth();
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      for (const expense of monthExpenses) {
        expect(expense.date.getTime()).toBeGreaterThanOrEqual(monthStart.getTime());
      }
    });
  });

  describe('Budgets', () => {
    it('should return all budgets', () => {
      const budgets = store.getBudgets();
      expect(budgets.length).toBeGreaterThan(0);
    });

    it('should get budget for category', () => {
      const budget = store.getBudgetForCategory('Groceries');
      expect(budget).toBeDefined();
      expect(budget?.category).toBe('Groceries');
    });

    it('should return undefined for non-existent budget', () => {
      const budget = store.getBudgetForCategory('NonExistent');
      expect(budget).toBeUndefined();
    });

    it('should calculate budget status', () => {
      const status = store.getBudgetStatus('Groceries');
      expect(status).toHaveProperty('spent');
      expect(status).toHaveProperty('limit');
      expect(status).toHaveProperty('percentage');
      expect(status.percentage).toBeLessThanOrEqual(100);
    });

    it('should update existing budget', () => {
      const oldStatus = store.getBudgetStatus('Groceries');
      store.updateBudget('Groceries', 500);
      const newStatus = store.getBudgetStatus('Groceries');

      expect(newStatus.limit).toBe(500);
      if (newStatus.limit > oldStatus.limit) {
        expect(newStatus.percentage).toBeLessThan(oldStatus.percentage);
      }
    });

    it('should create new budget for category without one', () => {
      const initialBudgets = store.getBudgets().length;
      store.updateBudget('Healthcare', 200);
      expect(store.getBudgets()).toHaveLength(initialBudgets + 1);

      const budget = store.getBudgetForCategory('Healthcare');
      expect(budget?.limit).toBe(200);
    });
  });

  describe('Categories', () => {
    it('should return all categories', () => {
      const categories = store.getCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty('name');
      expect(categories[0]).toHaveProperty('icon');
      expect(categories[0]).toHaveProperty('color');
    });

    it('should get category icon', () => {
      const icon = store.getCategoryIcon('Groceries');
      expect(icon).toBe('🛒');
    });

    it('should return default icon for unknown category', () => {
      const icon = store.getCategoryIcon('UnknownCategory');
      expect(icon).toBe('📌');
    });
  });

  describe('Analytics', () => {
    it('should calculate total spent today', () => {
      const total = store.getTotalSpentToday();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });

    it('should calculate total spent this month', () => {
      const total = store.getTotalSpentThisMonth();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });

    it('should calculate total spent all time', () => {
      const total = store.getTotalSpent();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThan(0);
    });

    it('should break down spending by category', () => {
      const spending = store.getSpentByCategory();
      expect(spending instanceof Map).toBe(true);
      expect(spending.size).toBeGreaterThan(0);

      // Verify totals
      let categoryTotal = 0;
      spending.forEach((amount) => {
        categoryTotal += amount;
      });
      expect(categoryTotal).toBe(store.getTotalSpent());
    });

    it('should get recurring expenses', () => {
      const recurring = store.getRecurringExpenses();
      expect(recurring.every((e) => e.isRecurring)).toBe(true);
    });

    it('should calculate monthly recurring total', () => {
      const total = store.getMonthlyRecurringTotal();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Observable Pattern', () => {
    it('should notify listeners on expense added', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.addExpense(50.0, 'Test', 'Test expense');

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on expense deleted', () => {
      const expenses = store.getExpenses();
      const listener = jest.fn();
      store.subscribe(listener);

      store.deleteExpense(expenses[0].id);

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on budget updated', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.updateBudget('Test', 100);

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();

      store.addExpense(50.0, 'Test', 'Test expense');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Data Integrity', () => {
    it('should not mutate returned expenses array', () => {
      const expenses1 = store.getExpenses();
      const expenses2 = store.getExpenses();

      expect(expenses1).not.toBe(expenses2);
    });

    it('should not mutate returned budgets array', () => {
      const budgets1 = store.getBudgets();
      const budgets2 = store.getBudgets();

      expect(budgets1).not.toBe(budgets2);
    });

    it('should generate unique expense IDs', () => {
      const exp1 = store.addExpense(50.0, 'Test1', 'Test');
      const exp2 = store.addExpense(50.0, 'Test2', 'Test');

      expect(exp1.id).not.toBe(exp2.id);
    });

    it('should preserve expense details on add', () => {
      const expense = store.addExpense(99.99, 'Groceries', 'Weekly shopping', true, 'weekly');

      expect(expense.amount).toBe(99.99);
      expect(expense.category).toBe('Groceries');
      expect(expense.description).toBe('Weekly shopping');
      expect(expense.isRecurring).toBe(true);
      expect(expense.recurringInterval).toBe('weekly');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount expenses', () => {
      const expense = store.addExpense(0, 'Test', 'Zero expense');
      expect(expense.amount).toBe(0);
    });

    it('should handle large amounts', () => {
      const expense = store.addExpense(999999.99, 'Test', 'Large amount');
      expect(expense.amount).toBe(999999.99);
    });

    it('should handle empty description', () => {
      const expense = store.addExpense(50.0, 'Test', '');
      expect(expense.description).toBe('');
    });

    it('should calculate budget percentage correctly', () => {
      // Add expense of 150 to Groceries (budget is 300)
      store.addExpense(150, 'Groceries', 'Test');
      const status = store.getBudgetStatus('Groceries');

      expect(status.percentage).toBeGreaterThan(0);
      expect(status.percentage).toBeLessThanOrEqual(100);
    });

    it('should handle category not found in getSpentByCategory', () => {
      const spending = store.getSpentByCategory();
      // Get highest spent category and verify it exists
      if (spending.size > 0) {
        const maxEntry = Array.from(spending.entries()).reduce((a, b) => (b[1] > a[1] ? b : a));
        expect(maxEntry[1]).toBeGreaterThan(0);
      }
    });
  });
});
