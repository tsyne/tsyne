/**
 * MVC (Model-View-Controller) Pattern Example
 *
 * Demonstrates the classic MVC pattern where:
 * - Model: Holds the application data and business logic
 * - View: Displays the UI and renders the model state
 * - Controller: Handles user input and updates the model
 */

import { app, resolveTransport, window, vbox, label, button, hbox, Model  } from '../core/src';

// ============================================================================
// MODEL - Holds data and business logic
// ============================================================================

class CounterModel extends Model {
  private count: number = 0;
  private readonly min: number;
  private readonly max: number;

  constructor(min: number = 0, max: number = 100) {
    super();
    this.min = min;
    this.max = max;
  }

  getCount(): number {
    return this.count;
  }

  increment(): boolean {
    if (this.count < this.max) {
      this.count++;
      this.notifyChanged();
      return true;
    }
    return false;
  }

  decrement(): boolean {
    if (this.count > this.min) {
      this.count--;
      this.notifyChanged();
      return true;
    }
    return false;
  }

  reset(): void {
    this.count = 0;
    this.notifyChanged();
  }

  canIncrement(): boolean {
    return this.count < this.max;
  }

  canDecrement(): boolean {
    return this.count > this.min;
  }
}

// ============================================================================
// VIEW - Renders the UI
// ============================================================================

class CounterView {
  private countLabel: any;
  private statusLabel: any;

  render(builder: () => void): void {
    builder();
  }

  createUI(
    onIncrement: () => void,
    onDecrement: () => void,
    onReset: () => void
  ): void {
    vbox(() => {
      label('MVC Pattern - Counter Example');
      label('');

      // Display area
      this.countLabel = label('Count: 0');
      this.statusLabel = label('Status: Ready');

      label('');

      // Control buttons
      hbox(() => {
        button('Decrement').onClick(onDecrement);
        button('Increment').onClick(onIncrement);
      });

      label('');
      button('Reset').onClick(onReset);
    });
  }

  updateCount(count: number): void {
    this.countLabel?.setText(`Count: ${count}`);
  }

  updateStatus(message: string): void {
    this.statusLabel?.setText(`Status: ${message}`);
  }
}

// ============================================================================
// CONTROLLER - Handles user interaction
// ============================================================================

class CounterController {
  constructor(
    private model: CounterModel,
    private view: CounterView
  ) {
    // Subscribe to model changes
    this.model.subscribe(() => {
      this.updateView();
    });
  }

  initialize(): void {
    this.view.createUI(
      () => this.handleIncrement(),
      () => this.handleDecrement(),
      () => this.handleReset()
    );
    this.updateView();
  }

  private handleIncrement(): void {
    if (this.model.increment()) {
      this.view.updateStatus('Incremented');
    } else {
      this.view.updateStatus('Cannot increment (max reached)');
    }
  }

  private handleDecrement(): void {
    if (this.model.decrement()) {
      this.view.updateStatus('Decremented');
    } else {
      this.view.updateStatus('Cannot decrement (min reached)');
    }
  }

  private handleReset(): void {
    this.model.reset();
    this.view.updateStatus('Reset to 0');
  }

  private updateView(): void {
    this.view.updateCount(this.model.getCount());
  }
}

// ============================================================================
// APPLICATION SETUP
// ============================================================================

app(resolveTransport(), { title: 'MVC Pattern Demo' }, () => {
  window({ title: 'MVC Counter', width: 300, height: 250 }, (win) => {
    // Create MVC components
    const model = new CounterModel(0, 100);
    const view = new CounterView();
    const controller = new CounterController(model, view);

    // Set up the UI
    win.setContent(() => {
      controller.initialize();
    });

    win.show();
  });
});
