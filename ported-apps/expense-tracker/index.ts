/**
 * DimeApp Expense Tracker - Tsyne Port
 *
 * @tsyne-app:name Expense Tracker
 * @tsyne-app:icon confirm
 * @tsyne-app:category Finance
 * @tsyne-app:builder buildExpenseTrackerApp
 * @tsyne-app:args app,windowWidth,windowHeight
 *
 * A personal finance tracker built in Tsyne showcasing:
 * - Expense tracking with categories
 * - Budget management and monitoring
 * - Recurring expense support
 * - Time-based filtering (today, month, all-time)
 * - Category-based analytics
 * - Dark mode support
 *
 * Portions copyright Rafael Soh and portions copyright Paul Hammant 2025
 */

// ============================================================================
// DATA MODELS
// ============================================================================

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  isRecurring: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  period: 'monthly' | 'yearly';
}

export interface Category {
  name: string;
  icon: string;
  color: string;
}

// ============================================================================
// EXPENSE TRACKER STORE (Observable)
// ============================================================================

type ChangeListener = () => void;

export class ExpenseStore {
  private expenses: Expense[] = [
    {
      id: 'exp-001',
      amount: 45.99,
      category: 'Groceries',
      description: 'Weekly groceries',
      date: new Date(Date.now() - 86400000), // Yesterday
      isRecurring: false,
    },
    {
      id: 'exp-002',
      amount: 12.50,
      category: 'Coffee',
      description: 'Morning coffee',
      date: new Date(Date.now() - 3600000), // 1 hour ago
      isRecurring: true,
      recurringInterval: 'daily',
    },
    {
      id: 'exp-003',
      amount: 120.00,
      category: 'Transport',
      description: 'Gas',
      date: new Date(),
      isRecurring: false,
    },
    {
      id: 'exp-004',
      amount: 89.99,
      category: 'Entertainment',
      description: 'Movie tickets',
      date: new Date(),
      isRecurring: false,
    },
  ];

  private budgets: Budget[] = [
    { id: 'budget-001', category: 'Groceries', limit: 300, period: 'monthly' },
    { id: 'budget-002', category: 'Coffee', limit: 100, period: 'monthly' },
    { id: 'budget-003', category: 'Transport', limit: 250, period: 'monthly' },
    { id: 'budget-004', category: 'Entertainment', limit: 150, period: 'monthly' },
  ];

  private categories: Category[] = [
    { name: 'Groceries', icon: '🛒', color: '#4CAF50' },
    { name: 'Coffee', icon: '☕', color: '#8D6E63' },
    { name: 'Transport', icon: '🚗', color: '#2196F3' },
    { name: 'Entertainment', icon: '🎬', color: '#9C27B0' },
    { name: 'Healthcare', icon: '🏥', color: '#F44336' },
    { name: 'Utilities', icon: '💡', color: '#FF9800' },
    { name: 'Other', icon: '📌', color: '#607D8B' },
  ];

  private nextExpenseId = 5;
  private changeListeners: ChangeListener[] = [];

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((listener) => listener());
  }

  // ========== Expenses ==========
  getExpenses(): Expense[] {
    return [...this.expenses].sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  getExpensesToday(): Expense[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.expenses.filter((e) => {
      const eDate = new Date(e.date);
      eDate.setHours(0, 0, 0, 0);
      return eDate.getTime() === today.getTime();
    });
  }

  getExpensesThisMonth(): Expense[] {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return this.expenses.filter((e) => e.date >= monthStart);
  }

  getExpensesByCategory(category: string): Expense[] {
    return this.expenses.filter((e) => e.category === category);
  }

  addExpense(amount: number, category: string, description: string, isRecurring: boolean = false, interval?: 'daily' | 'weekly' | 'monthly' | 'yearly'): Expense {
    const expense: Expense = {
      id: `exp-${String(this.nextExpenseId++).padStart(3, '0')}`,
      amount,
      category,
      description,
      date: new Date(),
      isRecurring,
      recurringInterval: interval,
    };
    this.expenses.unshift(expense);
    this.notifyChange();
    return expense;
  }

  deleteExpense(expenseId: string) {
    this.expenses = this.expenses.filter((e) => e.id !== expenseId);
    this.notifyChange();
  }

  // ========== Budgets ==========
  getBudgets(): Budget[] {
    return [...this.budgets];
  }

  getBudgetForCategory(category: string): Budget | undefined {
    return this.budgets.find((b) => b.category === category);
  }

  getBudgetStatus(category: string): { spent: number; limit: number; percentage: number } {
    const budget = this.getBudgetForCategory(category);
    const spent = this.getExpensesByCategory(category).reduce((sum, e) => sum + e.amount, 0);
    if (!budget) {
      return { spent, limit: 0, percentage: 0 };
    }
    return {
      spent,
      limit: budget.limit,
      percentage: Math.round((spent / budget.limit) * 100),
    };
  }

  updateBudget(category: string, limit: number) {
    let budget = this.budgets.find((b) => b.category === category);
    if (budget) {
      budget.limit = limit;
    } else {
      this.budgets.push({
        id: `budget-${Date.now()}`,
        category,
        limit,
        period: 'monthly',
      });
    }
    this.notifyChange();
  }

  // ========== Categories ==========
  getCategories(): Category[] {
    return [...this.categories];
  }

  getCategoryIcon(category: string): string {
    return this.categories.find((c) => c.name === category)?.icon || '📌';
  }

  // ========== Analytics ==========
  getTotalSpentToday(): number {
    return this.getExpensesToday().reduce((sum, e) => sum + e.amount, 0);
  }

  getTotalSpentThisMonth(): number {
    return this.getExpensesThisMonth().reduce((sum, e) => sum + e.amount, 0);
  }

  getTotalSpent(): number {
    return this.expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  getSpentByCategory(): Map<string, number> {
    const map = new Map<string, number>();
    for (const expense of this.expenses) {
      const current = map.get(expense.category) || 0;
      map.set(expense.category, current + expense.amount);
    }
    return map;
  }

  getRecurringExpenses(): Expense[] {
    return this.expenses.filter((e) => e.isRecurring);
  }

  getMonthlyRecurringTotal(): number {
    return this.getRecurringExpenses()
      .filter((e) => e.recurringInterval === 'daily' || e.recurringInterval === 'monthly')
      .reduce((sum, e) => sum + e.amount, 0);
  }
}

// ============================================================================
// VIEW BUILDER
// ============================================================================

export function buildExpenseTrackerApp(a: any, windowWidth?: number, windowHeight?: number): void {
  const isEmbedded = windowWidth !== undefined && windowHeight !== undefined;

  const store = new ExpenseStore();
  let selectedTab: 'expenses' | 'budgets' | 'analytics' = 'expenses';

  let expensesContainer: any;
  let budgetsContainer: any;
  let analyticsContainer: any;
  let viewStack: any;
  let totalTodayLabel: any;
  let totalMonthLabel: any;
  let win: any = null;

  async function updateSummaryLabels() {
    if (totalTodayLabel) {
      await totalTodayLabel.setText(`Today: $${store.getTotalSpentToday().toFixed(2)}`);
    }
    if (totalMonthLabel) {
      await totalMonthLabel.setText(`This Month: $${store.getTotalSpentThisMonth().toFixed(2)}`);
    }
  }

  const buildContent = () => {
    a.vbox(() => {
        // Header with summary
        a.hbox(() => {
          a.vbox(() => {
            a.label('💰 Expense Tracker').withId('app-title');
            a.label('Personal Finance Management').withId('app-subtitle');
          });
          a.spacer();
          totalTodayLabel = a.label('Today: $0.00', 'header-stat').withId('total-today');
          a.spacer();
          totalMonthLabel = a.label('This Month: $0.00', 'header-stat').withId('total-month');
        });

        a.separator();

        // Tab navigation
        a.hbox(() => {
          a.button('📊 Expenses')
            .withId('tab-expenses')
            .onClick(async () => {
              selectedTab = 'expenses';
              await viewStack.refresh();
            });
          a.button('💳 Budgets')
            .withId('tab-budgets')
            .onClick(async () => {
              selectedTab = 'budgets';
              await viewStack.refresh();
            });
          a.button('📈 Analytics')
            .withId('tab-analytics')
            .onClick(async () => {
              selectedTab = 'analytics';
              await viewStack.refresh();
            });
        });

        a.separator();

        // Content area
        viewStack = a.vbox(() => {
          // Expenses Tab
          expensesContainer = a.vbox(() => {
            a.label('Recent Expenses').withId('expenses-title');

            a.hbox(() => {
              a.button('➕ Add Expense')
                .withId('btn-add-expense')
                .onClick(async () => {
                  const result = await win.showForm('New Expense', [
                    { type: 'entry', label: 'Amount', key: 'amount' },
                    {
                      type: 'select',
                      label: 'Category',
                      key: 'category',
                      options: store.getCategories().map((c) => c.name),
                    },
                    { type: 'entry', label: 'Description', key: 'description' },
                    { type: 'check', label: 'Recurring?', key: 'recurring' },
                  ]);

                  if (result.submitted) {
                    const amount = parseFloat(result.values.amount);
                    if (!isNaN(amount)) {
                      store.addExpense(
                        amount,
                        result.values.category,
                        result.values.description,
                        result.values.recurring === 'true'
                      );
                    }
                  }
                });

              a.spacer();

              a.button('Today Only').withId('filter-today').onClick(async () => {
                const todayExpenses = store.getExpensesToday();
                await win.showInfo('Today Expenses', `You have ${todayExpenses.length} expenses today`);
              });

              a.button('This Month').withId('filter-month').onClick(async () => {
                const monthExpenses = store.getExpensesThisMonth();
                await win.showInfo('Month Expenses', `You have ${monthExpenses.length} expenses this month`);
              });
            });

            a.separator();

            // Expenses list
            a.vbox(() => {
              // Empty state
            })
              .bindTo({
                items: () => store.getExpenses(),
                empty: () => {
                  a.label('No expenses recorded');
                },
                render: (expense: Expense) => {
                  const icon = store.getCategoryIcon(expense.category);
                  a.hbox(() => {
                    a.label(`${icon} ${expense.category}`, 'expense-category').withId(
                      `exp-category-${expense.id}`
                    );
                    a.vbox(() => {
                      a.label(expense.description).withId(`exp-desc-${expense.id}`);
                      a.label(`${expense.date.toLocaleDateString()}`, 'expense-date').withId(
                        `exp-date-${expense.id}`
                      );
                    });
                    a.spacer();
                    a.label(`$${expense.amount.toFixed(2)}`, 'expense-amount').withId(
                      `exp-amount-${expense.id}`
                    );
                    a.button('✕')
                      .withId(`btn-delete-${expense.id}`)
                      .onClick(() => store.deleteExpense(expense.id));
                  });
                },
                trackBy: (expense: Expense) => expense.id,
              });
          }).when(() => selectedTab === 'expenses');

          // Budgets Tab
          budgetsContainer = a.vbox(() => {
            a.label('Budget Overview').withId('budgets-title');

            a.hbox(() => {
              a.button('➕ New Budget')
                .withId('btn-new-budget')
                .onClick(async () => {
                  const result = await win.showForm('Set Budget', [
                    {
                      type: 'select',
                      label: 'Category',
                      key: 'category',
                      options: store.getCategories().map((c) => c.name),
                    },
                    { type: 'entry', label: 'Monthly Limit', key: 'limit' },
                  ]);

                  if (result.submitted) {
                    const limit = parseFloat(result.values.limit);
                    if (!isNaN(limit)) {
                      store.updateBudget(result.values.category, limit);
                    }
                  }
                });
            });

            a.separator();

            // Budget list
            a.vbox(() => {
              // Empty state
            })
              .bindTo({
                items: () => store.getBudgets(),
                empty: () => {
                  a.label('No budgets set');
                },
                render: (budget: Budget) => {
                  const status = store.getBudgetStatus(budget.category);
                  const icon = store.getCategoryIcon(budget.category);
                  const progressBar =
                    '█'.repeat(Math.min(status.percentage, 100) / 10) +
                    '░'.repeat(10 - Math.min(status.percentage, 100) / 10);

                  a.hbox(() => {
                    a.vbox(() => {
                      a.label(`${icon} ${budget.category}`).withId(`budget-cat-${budget.id}`);
                      a.label(progressBar).withId(`budget-bar-${budget.id}`);
                      a.label(
                        `$${status.spent.toFixed(2)} / $${status.limit.toFixed(2)} (${status.percentage}%)`
                      ).withId(`budget-stats-${budget.id}`);
                    });
                  });
                },
                trackBy: (budget: Budget) => budget.id,
              });
          }).when(() => selectedTab === 'budgets');

          // Analytics Tab
          analyticsContainer = a.vbox(() => {
            a.label('Spending Analytics').withId('analytics-title');

            a.hbox(() => {
              a.vbox(() => {
                a.label('📌 Summary').withId('analytics-summary-label');
                a.label(`Total Spent: $${store.getTotalSpent().toFixed(2)}`).withId(
                  'analytics-total'
                );
                a.label(`This Month: $${store.getTotalSpentThisMonth().toFixed(2)}`).withId(
                  'analytics-month'
                );
                a.label(
                  `Monthly Recurring: $${store.getMonthlyRecurringTotal().toFixed(2)}`
                ).withId('analytics-recurring');
              });

              a.spacer();

              a.vbox(() => {
                a.label('📊 By Category').withId('analytics-category-label');
                const spentByCategory = store.getSpentByCategory();
                const entries = Array.from(spentByCategory.entries()).sort((a, b) => b[1] - a[1]);

                entries.slice(0, 5).forEach(([category, amount]) => {
                  const icon = store.getCategoryIcon(category);
                  a.label(`${icon} ${category}: $${amount.toFixed(2)}`).withId(
                    `analytics-cat-${category}`
                  );
                });
              });
            });

            a.separator();

            a.label('🔄 Recurring Expenses').withId('recurring-label');
            a.vbox(() => {
              // Empty state
            })
              .bindTo({
                items: () => store.getRecurringExpenses(),
                empty: () => {
                  a.label('No recurring expenses');
                },
                render: (expense: Expense) => {
                  const icon = store.getCategoryIcon(expense.category);
                  a.hbox(() => {
                    a.label(`${icon} ${expense.category}: $${expense.amount.toFixed(2)}`).withId(
                      `recurring-exp-${expense.id}`
                    );
                    a.label(`(${expense.recurringInterval})`).withId(
                      `recurring-interval-${expense.id}`
                    );
                  });
                },
                trackBy: (expense: Expense) => expense.id,
              });
          }).when(() => selectedTab === 'analytics');
        });
      });
    });
  };

  // Subscribe to store changes
  store.subscribe(async () => {
    await updateSummaryLabels();
    await viewStack.refresh();
  });

  if (isEmbedded) {
    buildContent();
    (async () => {
      await updateSummaryLabels();
    })();
  } else {
    a.window({ title: 'Expense Tracker', width: 1000, height: 750 }, (w: any) => {
      win = w;
      win.setContent(buildContent);

      // Initial setup
      (async () => {
        await updateSummaryLabels();
      })();

      win.show();
    });
  }
}

export default buildExpenseTrackerApp;
