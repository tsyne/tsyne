/**
 * DimeApp Expense Tracker - Tsyne Port
 *
 * @tsyne-app:name Expense Tracker
 * @tsyne-app:icon confirm
 * @tsyne-app:category Finance
 * @tsyne-app:args (a: App) => void
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
type ChangeListener = () => void;
export declare class ExpenseStore {
    private expenses;
    private budgets;
    private categories;
    private nextExpenseId;
    private changeListeners;
    subscribe(listener: ChangeListener): () => void;
    private notifyChange;
    getExpenses(): Expense[];
    getExpensesToday(): Expense[];
    getExpensesThisMonth(): Expense[];
    getExpensesByCategory(category: string): Expense[];
    addExpense(amount: number, category: string, description: string, isRecurring?: boolean, interval?: 'daily' | 'weekly' | 'monthly' | 'yearly'): Expense;
    deleteExpense(expenseId: string): void;
    getBudgets(): Budget[];
    getBudgetForCategory(category: string): Budget | undefined;
    getBudgetStatus(category: string): {
        spent: number;
        limit: number;
        percentage: number;
    };
    updateBudget(category: string, limit: number): void;
    getCategories(): Category[];
    getCategoryIcon(category: string): string;
    getTotalSpentToday(): number;
    getTotalSpentThisMonth(): number;
    getTotalSpent(): number;
    getSpentByCategory(): Map<string, number>;
    getRecurringExpenses(): Expense[];
    getMonthlyRecurringTotal(): number;
}
export declare function buildExpenseTrackerApp(a: any): void;
export default buildExpenseTrackerApp;
