# DimeApp Expense Tracker - Tsyne Port

A personal finance expense tracker ported from the open-source **DimeApp** (by Rafael Soh) to **Tsyne**, a TypeScript-based desktop application framework.

This single-file Tsyne application demonstrates:
- **Expense tracking** with categories and descriptions
- **Budget management** with spending limits per category
- **Recurring expenses** with customizable intervals
- **Spending analytics** with category breakdown and summaries
- **Time-based filtering** (today, this month, all-time)
- **Observable MVC pattern** for reactive updates

## Features

### Expense Management
- Add expenses with amount, category, description
- Support for recurring expenses (daily, weekly, monthly, yearly)
- Delete expenses
- Filter by category, time period
- Display total spent today and this month

### Budget Tracking
- Set monthly or yearly budgets by category
- Monitor spending against budgets
- Visual progress bars showing budget usage
- Percentage tracking (spent vs. limit)
- Create and update budgets dynamically

### Analytics & Reporting
- Total spending breakdown by category
- Monthly recurring expense totals
- Spending summary (today, this month, all-time)
- Top spending categories
- Recurring expenses overview

### Categories
- 7 pre-defined categories with icons and colors
  - Groceries 🛒
  - Coffee ☕
  - Transport 🚗
  - Entertainment 🎬
  - Healthcare 🏥
  - Utilities 💡
  - Other 📌

## User Interface

### Expenses Tab
```
┌──────────────────────────────────────────────────────────┐
│ 💰 Expense Tracker              Today: $120.00           │
│ Personal Finance Management     This Month: $268.47      │
├──────────────────────────────────────────────────────────┤
│ [📊 Expenses] [💳 Budgets] [📈 Analytics]
│ ─────────────────────────────────────────────────────────
│ Recent Expenses
│ [➕ Add Expense] [Today Only] [This Month]
│
│ ☕ Coffee: Morning coffee                  $12.50 [✕]
│ 🚗 Transport: Gas                         $120.00 [✕]
│ 🎬 Entertainment: Movie tickets            $89.99 [✕]
│ 🛒 Groceries: Weekly groceries             $45.99 [✕]
└──────────────────────────────────────────────────────────┘
```

### Budgets Tab
```
┌──────────────────────────────────────────────────────────┐
│ 💰 Expense Tracker              Today: $120.00           │
│ Personal Finance Management     This Month: $268.47      │
├──────────────────────────────────────────────────────────┤
│ [📊 Expenses] [💳 Budgets] [📈 Analytics]
│ ─────────────────────────────────────────────────────────
│ Budget Overview
│ [➕ New Budget]
│
│ 🛒 Groceries
│    ████████░░░░░░░░░░ $45.99 / $300.00 (15%)
│
│ ☕ Coffee
│    ████░░░░░░░░░░░░░░ $12.50 / $100.00 (12%)
│
│ 🚗 Transport
│    ██████████████░░░░ $120.00 / $250.00 (48%)
│
│ 🎬 Entertainment
│    ████████░░░░░░░░░░ $89.99 / $150.00 (60%)
└──────────────────────────────────────────────────────────┘
```

### Analytics Tab
```
┌──────────────────────────────────────────────────────────┐
│ 💰 Expense Tracker              Today: $120.00           │
│ Personal Finance Management     This Month: $268.47      │
├──────────────────────────────────────────────────────────┤
│ [📊 Expenses] [💳 Budgets] [📈 Analytics]
│ ─────────────────────────────────────────────────────────
│ Spending Analytics
│                                                           │
│ 📌 Summary          │  📊 By Category                    │
│ Total Spent: $268.47│  🎬 Entertainment: $89.99          │
│ This Month: $268.47 │  🚗 Transport: $120.00             │
│ Monthly Recurring:   │  🛒 Groceries: $45.99              │
│   $12.50            │  ☕ Coffee: $12.50                 │
│                     │  📌 Other: $0.00                   │
│
│ 🔄 Recurring Expenses
│ ☕ Coffee: $12.50 (daily)
└──────────────────────────────────────────────────────────┘
```

## Screenshots

To generate live screenshots of the application:

```bash
# Start app with visual display (requires X11/display)
npx tsx ported-apps/expense-tracker/index.ts

# Run tests with screenshot capture
TAKE_SCREENSHOTS=1 npm test ported-apps/expense-tracker/index.tsyne.test.ts

# Screenshots saved to:
# - /tmp/expense-tracker-expenses.png
# - /tmp/expense-tracker-budgets.png
# - /tmp/expense-tracker-analytics.png
```

Screenshots show:
- **Expenses Tab**: List of recent transactions with quick filters
- **Budgets Tab**: Budget progress bars by category with visual indicators
- **Analytics Tab**: Spending summary and category breakdown with recurring expenses

## Architecture

The app follows Tsyne's pseudo-declarative MVC pattern:

```typescript
// Observable Store Pattern
const store = new ExpenseStore();

store.subscribe(async () => {
  await updateSummaryLabels();
  await viewStack.refresh();
});

// Tab-based Navigation with when() Visibility
expensesContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'expenses');

budgetsContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'budgets');

analyticsContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'analytics');

// Smart List Rendering with bindTo()
a.vbox(() => {})
  .bindTo({
    items: () => store.getExpenses(),
    render: (expense: Expense) => {
      a.hbox(() => {
        // Render expense row
      });
    },
    trackBy: (expense: Expense) => expense.id,
  });
```

### Key Components

**Model: `ExpenseStore`**
- Observable pattern with change listeners
- Immutable data returning defensive copies
- Methods for expense, budget, and analytics operations
- Category management

**View: Tab-based UI**
- 3 main tabs: Expenses, Budgets, Analytics
- Declarative visibility with `when()`
- Smart list rendering with `bindTo()`
- Summary labels for quick overview

**Controller: Event Handlers**
- Add/delete expenses
- Create/update budgets
- Filter by time period
- Tab navigation

## Running the App

### Development Mode
```bash
npx tsx ported-apps/expense-tracker/index.ts
```

### Run Tests
```bash
# Jest unit tests (28 tests)
npm test ported-apps/expense-tracker/index.test.ts

# TsyneTest UI tests
npm test ported-apps/expense-tracker/index.tsyne.test.ts

# With screenshots
TAKE_SCREENSHOTS=1 npm test ported-apps/expense-tracker/index.tsyne.test.ts
```

### Desktop Environment
```bash
npx tsx examples/desktop-demo.ts
# (Expense Tracker app automatically discovered and available)
```

## Testing

### Jest Unit Tests (28 tests)
```
ExpenseStore
  ✓ Expenses (7 tests)
  ✓ Budgets (6 tests)
  ✓ Categories (3 tests)
  ✓ Analytics (6 tests)
  ✓ Observable Pattern (4 tests)
  ✓ Data Integrity (3 tests)
  ✓ Edge Cases (5 tests)
```

Tests cover:
- Expense add/delete/filter operations
- Budget creation and tracking
- Analytics calculations
- Observable subscription patterns
- Data immutability
- Edge cases (zero amounts, large values, etc.)

### TsyneTest UI Tests
- App rendering and layout
- Tab navigation
- Summary label display
- Filter functionality
- Accessibility (proper IDs)
- Screenshot capture

## Code Style

Demonstrates Tsyne best practices:

```typescript
// Pseudo-declarative UI construction
a.window({ title: 'Expense Tracker' }, (win) => {
  win.setContent(() => {
    a.vbox(() => {
      // Header with summary
      a.hbox(() => {
        a.label('💰 Expense Tracker');
        a.spacer();
        totalTodayLabel = a.label('Today: $0.00').withId('total-today');
        totalMonthLabel = a.label('This Month: $0.00').withId('total-month');
      });

      // Tab navigation
      a.hbox(() => {
        a.button('Expenses').onClick(async () => {
          selectedTab = 'expenses';
          await viewStack.refresh();
        });
        a.button('Budgets').onClick(async () => {
          selectedTab = 'budgets';
          await viewStack.refresh();
        });
        a.button('Analytics').onClick(async () => {
          selectedTab = 'analytics';
          await viewStack.refresh();
        });
      });

      // Content with declarative visibility
      viewStack = a.vbox(() => {
        expensesContainer = a.vbox(() => { /* ... */ })
          .when(() => selectedTab === 'expenses');
        budgetsContainer = a.vbox(() => { /* ... */ })
          .when(() => selectedTab === 'budgets');
        analyticsContainer = a.vbox(() => { /* ... */ })
          .when(() => selectedTab === 'analytics');
      });
    });
  });

  // Observable subscriptions for reactive updates
  store.subscribe(async () => {
    await updateSummaryLabels();
    await viewStack.refresh();
  });
});
```

## Single File Design

The entire application (500+ lines) is a single `index.ts` file, eliminating build complexity. This demonstrates Tsyne's ability to build feature-rich financial applications without:
- Webpack/bundler configuration
- Component framework overhead
- Complex project structure
- Build toolchain management

Compare to DimeApp's original iOS/Swift implementation with Xcode, multiple files, and SwiftUI complexity.

## Data Model

```typescript
interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  isRecurring: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

interface Budget {
  id: string;
  category: string;
  limit: number;
  period: 'monthly' | 'yearly';
}

interface Category {
  name: string;
  icon: string;
  color: string;
}
```

## Future Enhancements

- Export to CSV/JSON
- Search expenses by description
- Custom categories
- Monthly budget reports
- Data persistence to filesystem
- iCloud sync (Tsyne browser mode)
- Mobile-optimized responsive layout

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 9/10 | Clean `vbox > hbox + separator + vbox` nesting. `buildContent()` defines header, tab bar, and 3 tab containers in a single readable tree. `win.showForm()` for CRUD dialogs keeps the main layout clean |
| **Core declarative** | Fluent method chaining | 8/10 | `.withId()` on all tab buttons, action buttons, and per-item elements (`exp-category-{id}`, `exp-desc-{id}`, `budget-cat-{id}`). `.when()` on all 3 tab containers. `.bindTo()` with `trackBy` on 3 lists |
| **Core declarative** | Programmatic generation | 7/10 | Analytics tab uses `entries.slice(0, 5).forEach()` to generate category breakdown. Category options for forms derived from `store.getCategories().map()`. Tab buttons manually listed |
| **State architecture** | Observable store | 9/10 | Full `ExpenseStore` with `subscribe()`/`notifyChange()`. Defensive copies on `getExpenses()`, `getBudgets()`, `getCategories()`. Counter-based IDs (`exp-005`). Event handlers only call store methods. `empty` callback on `.bindTo()` for empty-state rendering |
| **Declarative updates** | `.when()` + `.bindTo()` | 9/10 | 3 tab containers (expenses, budgets, analytics) use `.when()`. 3 lists use `.bindTo()` with `trackBy` — expenses, budgets, recurring. `viewStack.refresh()` in store subscription. Two `setText()` escapes for summary labels (`total-today`, `total-month`) |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 1 | Uses `win.setContent(buildContent)` for initial render, but all subsequent updates go through `.when()`, `.bindTo()`, and `viewStack.refresh()`. Minor penalty for initial setContent pattern |
| **Testing** | `.withId()` coverage | 8/10 | IDs on all tab buttons, add/filter buttons, per-expense fields (category, desc, date, amount, delete), per-budget fields (cat, bar, stats). Comprehensive coverage for UI testing |
| **Design** | Separation of concerns | 9/10 | `ExpenseStore` is 240 lines of pure finance logic (expenses, budgets, categories, analytics). `buildExpenseTrackerApp()` is purely presentational. Store drives all state transitions via `notifyChange()` |
| | **Overall** | **9/10** | Strong pseudo-declarative implementation. 3 tabs with `.when()`, 3 lists with `.bindTo()` + `trackBy`, `empty` callbacks, `showForm()` for dialogs, and a clean Observable store with defensive copies. The only gap is two `setText()` calls on summary labels that could use `.bindText()` |

## License

Portions copyright Rafael Soh and portions copyright Paul Hammant 2025

Licensed under MIT License. See LICENSE file for details.

### DimeApp Original License
The original DimeApp project is available at https://github.com/rarfell/dimeApp
Licensed under GPL-3.0. This port is distributed under MIT with attribution.

## References

- [DimeApp Original Repository](https://github.com/rarfell/dimeApp)
- [Pseudo-Declarative UI Composition](../../docs/pseudo-declarative-ui-composition.md)
- [TsyneTest Framework](../../docs/TESTING.md)
- [Tsyne API Reference](../../docs/API_REFERENCE.md)
