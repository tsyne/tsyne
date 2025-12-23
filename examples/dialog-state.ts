/**
 * Dialog State Passing Example
 *
 * Demonstrates how to pass state into a "dialog" (new window) and retrieve
 * results back, similar to dialog patterns in traditional UI frameworks.
 *
 * This example shows:
 * 1. Passing initial state into a dialog
 * 2. Retrieving results from the dialog
 * 3. Using promises to handle async dialog results
 */

import { app, resolveTransport, window, vbox, hbox, label, entry, button, StateStore  } from '../core/src';

// ============================================================================
// Dialog State Management
// ============================================================================

interface DialogResult<T> {
  confirmed: boolean;
  data?: T;
}

class DialogManager<TInput, TOutput> {
  private resolveFunc?: (result: DialogResult<TOutput>) => void;
  private promise?: Promise<DialogResult<TOutput>>;

  /**
   * Show a dialog and return a promise that resolves with the result
   */
  show(): Promise<DialogResult<TOutput>> {
    this.promise = new Promise<DialogResult<TOutput>>((resolve) => {
      this.resolveFunc = resolve;
    });
    return this.promise;
  }

  /**
   * Confirm the dialog with data
   */
  confirm(data: TOutput): void {
    if (this.resolveFunc) {
      this.resolveFunc({ confirmed: true, data });
      this.cleanup();
    }
  }

  /**
   * Cancel the dialog
   */
  cancel(): void {
    if (this.resolveFunc) {
      this.resolveFunc({ confirmed: false });
      this.cleanup();
    }
  }

  private cleanup(): void {
    this.resolveFunc = undefined;
    this.promise = undefined;
  }
}

// ============================================================================
// User Profile Dialog
// ============================================================================

interface UserProfile {
  name: string;
  email: string;
  age: number;
}

class ProfileDialog {
  private nameEntry: any;
  private emailEntry: any;
  private ageEntry: any;
  private statusLabel: any;
  private manager = new DialogManager<UserProfile, UserProfile>();

  constructor(private initialProfile: UserProfile) {}

  /**
   * Show the dialog and return the result
   */
  async show(): Promise<DialogResult<UserProfile>> {
    const resultPromise = this.manager.show();

    window({ title: 'Edit Profile', width: 400, height: 350 }, (win) => {
      win.setContent(() => {
        vbox(() => {
          label('Edit User Profile');
          label('');

          // Name field
          label('Name:');
          this.nameEntry = entry(this.initialProfile.name);

          label('');

          // Email field
          label('Email:');
          this.emailEntry = entry(this.initialProfile.email);

          label('');

          // Age field
          label('Age:');
          this.ageEntry = entry(String(this.initialProfile.age));

          label('');

          // Status
          this.statusLabel = label('Edit the fields and click Save');

          label('');

          // Buttons
          hbox(() => {
            button('Save').onClick(async () => {
              const profile = await this.getProfileFromInputs();
              if (this.validateProfile(profile)) {
                this.manager.confirm(profile);
                // In a real app, we would close the window here
                this.statusLabel.setText('✓ Saved! (Window would close)');
              }
            });

            button('Cancel').onClick(() => {
              this.manager.cancel();
              this.statusLabel.setText('✗ Cancelled (Window would close)');
            });
          });
        });
      });

      win.show();
    });

    return resultPromise;
  }

  private async getProfileFromInputs(): Promise<UserProfile> {
    return {
      name: (await this.nameEntry.getText()) || '',
      email: (await this.emailEntry.getText()) || '',
      age: parseInt((await this.ageEntry.getText()) || '0', 10)
    };
  }

  private validateProfile(profile: UserProfile): boolean {
    if (!profile.name || profile.name.trim().length === 0) {
      this.statusLabel?.setText('⚠ Name is required');
      return false;
    }

    if (!profile.email || !profile.email.includes('@')) {
      this.statusLabel?.setText('⚠ Valid email is required');
      return false;
    }

    if (profile.age < 1 || profile.age > 150) {
      this.statusLabel?.setText('⚠ Age must be between 1 and 150');
      return false;
    }

    return true;
  }
}

// ============================================================================
// Main Application with State Store
// ============================================================================

interface AppState {
  userProfile: UserProfile;
  lastUpdate: string;
}

app(resolveTransport(), { title: 'Dialog State Demo' }, () => {
  // Create a state store for the application
  const store = new StateStore<AppState>({
    userProfile: {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30
    },
    lastUpdate: 'Never'
  });

  let profileLabel: any;
  let updateLabel: any;

  // Subscribe to state changes
  store.subscribe((state) => {
    const { name, email, age } = state.userProfile;
    profileLabel?.setText(`Profile: ${name}, ${email}, ${age} years old`);
    updateLabel?.setText(`Last Updated: ${state.lastUpdate}`);
  });

  window({ title: 'Main Window - State Passing', width: 500, height: 300 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Dialog State Passing Example');
        label('');
        label('This example demonstrates:');
        label('• Passing state into a dialog');
        label('• Retrieving results from the dialog');
        label('• Using a centralized state store');
        label('');

        // Display current state
        const profile = store.getState().userProfile;
        profileLabel = label(`Profile: ${profile.name}, ${profile.email}, ${profile.age} years old`);
        updateLabel = label(`Last Updated: ${store.getState().lastUpdate}`);

        label('');

        // Button to open dialog
        button('Edit Profile (Open Dialog)').onClick(async () => {
          // Get current profile from store
          const currentProfile = store.getState().userProfile;

          // Create and show dialog with current state
          const dialog = new ProfileDialog(currentProfile);
          const result = await dialog.show();

          // Handle result
          if (result.confirmed && result.data) {
            // Update the store with new data
            store.update(state => ({
              ...state,
              userProfile: result.data!,
              lastUpdate: new Date().toLocaleTimeString()
            }));
          }
        });

        label('');

        // Button to reset state
        button('Reset Profile').onClick(() => {
          store.update(state => ({
            ...state,
            userProfile: {
              name: 'John Doe',
              email: 'john@example.com',
              age: 30
            },
            lastUpdate: new Date().toLocaleTimeString()
          }));
        });
      });
    });

    win.show();
  });
});
