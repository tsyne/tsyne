/**
 * MVVM (Model-View-ViewModel) Pattern Example
 *
 * Demonstrates the MVVM pattern where:
 * - Model: Domain data and business logic
 * - View: UI presentation (declarative)
 * - ViewModel: Presentation logic with observable properties that the view binds to
 *
 * This pattern emphasizes data binding and separation of presentation logic.
 */

import { app, resolveTransport,
  window,
  vbox,
  hbox,
  label,
  entry,
  button,
  ObservableState,
  ComputedState,
  ViewModel
 } from '../core/src';

// ============================================================================
// MODEL - Domain data
// ============================================================================

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

class TodoModel {
  private todos: TodoItem[] = [];
  private nextId = 1;

  addTodo(text: string): TodoItem {
    const todo: TodoItem = {
      id: this.nextId++,
      text,
      completed: false
    };
    this.todos.push(todo);
    return todo;
  }

  removeTodo(id: number): void {
    this.todos = this.todos.filter(t => t.id !== id);
  }

  getTodos(): TodoItem[] {
    return [...this.todos];
  }

  getActiveTodos(): TodoItem[] {
    return this.todos.filter(t => !t.completed);
  }

  getCompletedTodos(): TodoItem[] {
    return this.todos.filter(t => t.completed);
  }

  toggleTodo(id: number): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  }

  clearCompleted(): void {
    this.todos = this.todos.filter(t => !t.completed);
  }
}

// ============================================================================
// VIEWMODEL - Presentation logic with observable properties
// ============================================================================

class TodoViewModel extends ViewModel {
  // Observable state properties
  newTodoText = new ObservableState('');
  todos = new ObservableState<TodoItem[]>([]);
  todoCount = new ObservableState(0);
  activeCount = new ObservableState(0);
  completedCount = new ObservableState(0);

  // Computed properties
  statusText: ComputedState<string, [number, number]>;

  constructor(private model: TodoModel) {
    super();

    // Create computed property for status text
    this.statusText = new ComputedState(
      [this.activeCount, this.todoCount],
      (active, total) => `${active} active / ${total} total`
    );

    // Clean up computed state when disposed
    this.addDisposable(() => this.statusText.dispose());
  }

  // Commands (methods that the view can call)
  addTodo(): void {
    const text = this.newTodoText.get().trim();
    if (text) {
      this.model.addTodo(text);
      this.newTodoText.set('');
      this.updateFromModel();
    }
  }

  removeTodo(id: number): void {
    this.model.removeTodo(id);
    this.updateFromModel();
  }

  toggleTodo(id: number): void {
    this.model.toggleTodo(id);
    this.updateFromModel();
  }

  clearCompleted(): void {
    this.model.clearCompleted();
    this.updateFromModel();
  }

  // Sync ViewModel state from Model
  private updateFromModel(): void {
    this.todos.set(this.model.getTodos());
    this.todoCount.set(this.model.getTodos().length);
    this.activeCount.set(this.model.getActiveTodos().length);
    this.completedCount.set(this.model.getCompletedTodos().length);
  }
}

// ============================================================================
// VIEW - UI presentation with data binding
// ============================================================================

class TodoView {
  private inputEntry: any;
  private todoListLabel: any;
  private statusLabel: any;

  constructor(private viewModel: TodoViewModel) {
    // Bind to ViewModel changes
    this.viewModel.todos.subscribe(() => this.updateTodoList());
    this.viewModel.statusText.subscribe((text) => this.updateStatus(text));
  }

  render(): void {
    vbox(() => {
      label('MVVM Pattern - Todo List');
      label('');

      // Input area
      hbox(() => {
        this.inputEntry = entry('Enter a todo...');
        button('Add').onClick(() => this.viewModel.addTodo());
      });

      label('');

      // Todo list display
      this.todoListLabel = label('No todos yet');

      label('');

      // Status and actions
      this.statusLabel = label(this.viewModel.statusText.get());

      label('');

      hbox(() => {
        button('Clear Completed').onClick(() => this.viewModel.clearCompleted());
      });
    });

    // Initial update
    this.updateTodoList();
    this.updateStatus(this.viewModel.statusText.get());
  }

  private updateTodoList(): void {
    const todos = this.viewModel.todos.get();
    if (todos.length === 0) {
      this.todoListLabel?.setText('No todos yet');
    } else {
      const todoText = todos
        .map(t => `${t.completed ? '✓' : '○'} ${t.text}`)
        .join(' | ');
      this.todoListLabel?.setText(todoText);
    }
  }

  private updateStatus(text: string): void {
    this.statusLabel?.setText(`Status: ${text}`);
  }
}

// ============================================================================
// APPLICATION SETUP
// ============================================================================

app(resolveTransport(), { title: 'MVVM Pattern Demo' }, () => {
  window({ title: 'MVVM Todo List', width: 500, height: 300 }, (win) => {
    // Create Model and ViewModel
    const model = new TodoModel();
    const viewModel = new TodoViewModel(model);
    const view = new TodoView(viewModel);

    // Add some sample data
    model.addTodo('Learn Tsyne');
    model.addTodo('Understand MVVM');
    model.addTodo('Build awesome apps');
    viewModel['updateFromModel'](); // Sync initial state

    // Render the view
    win.setContent(() => {
      view.render();
    });

    win.show();
  });
});
