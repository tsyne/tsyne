/**
 * Designer scenarios for todomvc.ts
 *
 * Each scenario provides mock implementations of classes/dependencies
 * that the designer will inject before executing the app code.
 *
 * Select scenarios in the designer UI to preview different app states.
 */

// Mock base class with common no-op implementations
class BaseMockTodoStore {
  subscribe(fn: Function) {
    // Trigger initial render
    setTimeout(() => fn(), 0);
    return () => {};
  }
  async load() {}
  save() {}
  async addTodo() { return { id: 0, text: '', completed: false }; }
  async toggleTodo() {}
  async updateTodo() {}
  async deleteTodo() {}
  async clearCompleted() {}
  async setFilter() {}
  getFilePath() { return 'mock-todos.json'; }
}

export const scenarios = {
  "Empty state": {
    description: "No todos yet - shows empty state message",
    mocks: {
      TodoStore: class extends BaseMockTodoStore {
        getAllTodos() { return []; }
        getFilteredTodos() { return []; }
        getFilter() { return 'all' as const; }
        getActiveCount() { return 0; }
        getCompletedCount() { return 0; }
      }
    }
  },

  "With todos": {
    description: "Two todos - one active, one completed",
    mocks: {
      TodoStore: class extends BaseMockTodoStore {
        private todos = [
          { id: 1, text: "Buy milk", completed: false },
          { id: 2, text: "Walk the dog", completed: true }
        ];
        getAllTodos() { return this.todos; }
        getFilteredTodos() { return this.todos; }
        getFilter() { return 'all' as const; }
        getActiveCount() { return 1; }
        getCompletedCount() { return 1; }
      }
    }
  },

  "Many todos": {
    description: "Multiple todos to test scrolling",
    mocks: {
      TodoStore: class extends BaseMockTodoStore {
        private todos = [
          { id: 1, text: "Learn TypeScript", completed: true },
          { id: 2, text: "Build Tsyne app", completed: true },
          { id: 3, text: "Write tests", completed: false },
          { id: 4, text: "Deploy to production", completed: false },
          { id: 5, text: "Write documentation", completed: false },
          { id: 6, text: "Add dark mode", completed: false }
        ];
        getAllTodos() { return this.todos; }
        getFilteredTodos() { return this.todos; }
        getFilter() { return 'all' as const; }
        getActiveCount() { return 4; }
        getCompletedCount() { return 2; }
      }
    }
  },

  "Active filter": {
    description: "Viewing only active (incomplete) todos",
    mocks: {
      TodoStore: class extends BaseMockTodoStore {
        private todos = [
          { id: 1, text: "Buy milk", completed: false },
          { id: 2, text: "Walk the dog", completed: true },
          { id: 3, text: "Do laundry", completed: false }
        ];
        getAllTodos() { return this.todos; }
        getFilteredTodos() { return this.todos.filter(t => !t.completed); }
        getFilter() { return 'active' as const; }
        getActiveCount() { return 2; }
        getCompletedCount() { return 1; }
      }
    }
  },

  "Completed filter": {
    description: "Viewing only completed todos",
    mocks: {
      TodoStore: class extends BaseMockTodoStore {
        private todos = [
          { id: 1, text: "Buy milk", completed: true },
          { id: 2, text: "Walk the dog", completed: true }
        ];
        getAllTodos() { return this.todos; }
        getFilteredTodos() { return this.todos; }
        getFilter() { return 'completed' as const; }
        getActiveCount() { return 0; }
        getCompletedCount() { return 2; }
      }
    }
  }
};

export default scenarios;
